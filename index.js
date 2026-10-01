// Line terminators as per ECMAScript (CRLF first so it counts as a single break)
const LINE_BREAK_REGEX = /\r\n|[\n\r\u{2028}\u{2029}]/u;

// Break opportunities as per UAX #14: whitespace and zero width space (ZW),
// except no-break spaces (GL) and zero width no-break space (WJ)
const BREAK_SPACE = String.raw`[\s\u{200B}]--[\u{A0}\u{2007}\u{202F}\u{FEFF}]`;
const WORD_REGEX = new RegExp(`([${BREAK_SPACE}]*)([^${BREAK_SPACE}]+)`, "gv");

// Break after a hyphen between letters (well-known), not in "--flag" or "-1"
const HYPHEN_BREAK_REGEX = /(?<=[\p{L}\p{M}][-\u{2010}])(?=\p{L})/u;

const SOFT_HYPHEN = "\u{AD}";

const ANY_HYPHEN_REGEX = /[-\u{2010}\u{AD}]/u;

const HARD_HYPHENS = new Set(["-", "\u{2010}"]);

// Below combining marks (U+0300), each code unit is a grapheme. CRLF is split beforehand.
const SINGLE_UNIT_GRAPHEMES_REGEX = /^[\u{0}-\u{2FF}]*$/u;

const segmenter = new Intl.Segmenter();

const getWidth = (string) =>
  SINGLE_UNIT_GRAPHEMES_REGEX.test(string)
    ? string.length
    : Iterator.from(segmenter.segment(string)).reduce((width) => width + 1, 0);

// Grapheme clusters so combining marks, emoji sequences and surrogate pairs are never split
const getGraphemeOffsets = (string) =>
  SINGLE_UNIT_GRAPHEMES_REGEX.test(string)
    ? null
    : Array.from(segmenter.segment(string), ({ index }) => index).concat(
        string.length,
      );

const getIndent = (indent) =>
  typeof indent === "number" ? " ".repeat(indent) : indent;

// [text, hyphen] pairs, the hyphen only showing if the line breaks after text
const getFragments = (word, hyphens) => {
  if (!ANY_HYPHEN_REGEX.test(word)) return [[word, ""]];

  // Unused soft hyphens are removed as they can render visibly in plain text
  const parts =
    hyphens === "manual"
      ? word.split(SOFT_HYPHEN)
      : [word.replaceAll(SOFT_HYPHEN, "")];

  return parts.filter(Boolean).flatMap((part, index, { length }) => {
    const pieces = part.split(HYPHEN_BREAK_REGEX);
    const hyphen = index < length - 1 ? "-" : "";
    return pieces.map((text, pieceIndex) => [
      text,
      pieceIndex === pieces.length - 1 ? hyphen : "",
    ]);
  });
};

/**
 * Wrap a string to a maximum number of characters per line, optionally with
 * indentation.
 *
 * @param {string} string
 * @param {number} [length=10]
 * @param {import("./types.js").WordWrapOptions} [options={}]
 * @returns {string}
 */
const wordWrap = (
  string,
  length = 10,
  {
    indent = 0,
    indentFirst = indent,
    newlineChar = "\n",
    global = true,
    breakLongWords = false,
    hyphens = "manual",
    trim = false,
  } = {},
) => {
  if (!(length >= 1)) {
    throw new RangeError(`Expected length to be >= 1, got ${length}.`);
  }

  const firstIndent = getIndent(indentFirst);
  const restIndent = getIndent(indent);

  // Always leave room for at least one character, even if the indent fills the line
  const firstWidth = Math.max(1, length - getWidth(firstIndent));
  const restWidth = Math.max(1, length - getWidth(restIndent));

  const lines = [];
  let line = "";
  let lineWidth = 0;
  let lineHyphen = "";
  // Leading empty lines don't count as the first line
  let isFirstLine = true;

  const getMaxWidth = () => {
    if (isFirstLine) return firstWidth;
    return global ? restWidth : Infinity;
  };

  const append = (text, width, hyphen = "") => {
    line += text;
    lineWidth += width;
    lineHyphen = hyphen;
  };

  const breakLine = () => {
    if (line === "") {
      lines.push("");
    } else {
      lines.push((isFirstLine ? firstIndent : restIndent) + line + lineHyphen);
      isFirstLine = false;
    }
    line = "";
    lineWidth = 0;
    lineHyphen = "";
  };

  const breakFragment = (space, fragment, hyphen) => {
    const offsets = getGraphemeOffsets(fragment);
    const count = offsets ? offsets.length - 1 : fragment.length;
    const getOffset = (index) => (offsets ? offsets[index] : index);
    const endsWithHardHyphen =
      count > 1 && HARD_HYPHENS.has(fragment.slice(getOffset(count - 1)));

    // Furthest grapheme index a chunk from start can end at
    const getChunkEnd = (start, availableWidth) => {
      // Widths are integers, lengths might not be
      let end = Math.min(count, start + Math.floor(availableWidth));
      if (end === count && end - start + hyphen.length > availableWidth) end--;
      // A trailing hard hyphen never starts a line
      if (end === count - 1 && endsWithHardHyphen) end--;
      return end;
    };

    // Like at any break point, whitespace is dropped if nothing can follow it
    if (space !== "") {
      const spaceWidth = getWidth(space);
      if (getChunkEnd(0, getMaxWidth() - spaceWidth) > 0) {
        append(space, spaceWidth);
      }
    }

    for (let start = 0; start < count;) {
      let end = getChunkEnd(start, getMaxWidth() - lineWidth);
      // Nothing fits on an empty line: overflow with the smallest unbreakable chunk
      if (end <= start) {
        end = endsWithHardHyphen && start === count - 2 ? count : start + 1;
      }
      append(
        fragment.slice(getOffset(start), getOffset(end)),
        end - start,
        end === count ? hyphen : "",
      );
      if (end < count) breakLine();
      start = end;
    }
  };

  const appendFragment = (space, fragment, hyphen) => {
    // Space is the input line's own indentation at line start, dropped at break points elsewhere.
    // Measured with the fragment as a leading combining mark joins its grapheme.
    let leading = line === "" && trim ? "" : space;
    let width = getWidth(leading + fragment);

    // The hyphen must fit too, as the line might break right after
    if (line !== "" && lineWidth + width + hyphen.length > getMaxWidth()) {
      breakLine();
      if (leading !== "") {
        leading = "";
        width = getWidth(fragment);
      }
    }

    if (breakLongWords && width + hyphen.length > getMaxWidth()) {
      breakFragment(leading, fragment, hyphen);
    } else {
      append(leading + fragment, width, hyphen);
    }
  };

  for (const paragraph of String(string).split(LINE_BREAK_REGEX)) {
    // Trailing whitespace is never matched hence dropped
    for (const [, space, word] of paragraph.matchAll(WORD_REGEX)) {
      getFragments(word, hyphens).forEach(([fragment, hyphen], index) => {
        appendFragment(index === 0 ? space : "", fragment, hyphen);
      });
    }
    breakLine();
  }

  return lines.join(newlineChar);
};

export default wordWrap;

export * from "./types.js";
