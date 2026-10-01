import { describe, test } from "node:test";
import assert from "node:assert";

import wordWrap from "../index.js";

// Article 11 of the Declaration of the Rights of Man and of the Citizen of 1789
const TEST_STRING = `  Article 11.

La libre communication des pensées et des opinions est un des droits les plus précieux de l'homme ; tout citoyen peut donc parler, écrire, imprimer librement, sauf à répondre de l'abus de cette liberté dans les cas déterminés par la loi.`;

const TEST_STRING_SHORT = "the quick brown fox jumps over the lazy dog";

const LONG_WORD = "supercalifragilisticexpialidocious";

const getLineWidths = (string) =>
  string
    .split("\n")
    .map((line) => [...new Intl.Segmenter().segment(line)].length);

describe("wordWrap", () => {
  describe("basic wrapping", () => {
    test("should return the original string if shorter than length", () => {
      assert.strictEqual(wordWrap("short"), "short");
      assert.strictEqual(wordWrap("0123456789", 10), "0123456789");
    });

    test("should default to a length of 10", () => {
      assert.strictEqual(
        wordWrap(TEST_STRING_SHORT),
        "the quick\nbrown fox\njumps over\nthe lazy\ndog",
      );
    });

    test("should wrap at the last whitespace fitting in length", () => {
      assert.strictEqual(
        wordWrap(TEST_STRING_SHORT, 20),
        "the quick brown fox\njumps over the lazy\ndog",
      );
    });

    test("should never leave whitespace at line ends", () => {
      const lines = wordWrap(TEST_STRING, 15).split("\n");
      assert.ok(lines.every((line) => !/\s$/.test(line)));
    });

    test("should drop whitespace runs at break points", () => {
      assert.strictEqual(wordWrap("aaaa    bbbb", 5), "aaaa\nbbbb");
      assert.strictEqual(wordWrap("aaaa \t bbbb", 5), "aaaa\nbbbb");
    });

    test("should preserve whitespace runs between words on the same line", () => {
      assert.strictEqual(wordWrap("a  b", 10), "a  b");
      assert.strictEqual(wordWrap("a\tb", 10), "a\tb");
    });

    test("should drop trailing whitespace", () => {
      assert.strictEqual(wordWrap("aaaa   ", 10), "aaaa");
      assert.strictEqual(wordWrap("aaaa   \nbbbb", 10), "aaaa\nbbbb");
    });

    test("should keep lines within length", () => {
      const lengths = [5, 10, 20, 40, 80];
      assert.ok(
        lengths.every((length) =>
          getLineWidths(
            wordWrap(TEST_STRING, length, { breakLongWords: true }),
          ).every((width) => width <= length),
        ),
      );
    });

    test("should wrap the test article", () => {
      assert.strictEqual(
        wordWrap(TEST_STRING, 40),
        `  Article 11.

La libre communication des pensées et
des opinions est un des droits les plus
précieux de l'homme ; tout citoyen peut
donc parler, écrire, imprimer librement,
sauf à répondre de l'abus de cette
liberté dans les cas déterminés par la
loi.`,
      );
    });

    test("should not lose or reorder any word", () => {
      const words = (string) => string.split(/\s+/).filter(Boolean);
      // TEST_STRING has no hyphen so words cannot be split
      const lengths = [1, 7, 33];
      assert.deepStrictEqual(
        lengths.map((length) => words(wordWrap(TEST_STRING, length))),
        lengths.map(() => words(TEST_STRING)),
      );
    });
  });

  describe("line breaks", () => {
    test("should preserve existing newlines", () => {
      assert.strictEqual(
        wordWrap("line1\nline2\nline3", 10),
        "line1\nline2\nline3",
      );
    });

    test("should preserve empty lines", () => {
      assert.strictEqual(wordWrap("para1\n\npara2", 10), "para1\n\npara2");
      assert.strictEqual(wordWrap("a\n\n\nb", 10), "a\n\n\nb");
      assert.strictEqual(wordWrap("\na\n", 10), "\na\n");
    });

    test("should wrap each input line independently", () => {
      assert.strictEqual(
        wordWrap("aaaa bbbb\ncccc dddd", 5),
        "aaaa\nbbbb\ncccc\ndddd",
      );
    });

    test("should handle CRLF, CR and Unicode line terminators", () => {
      assert.strictEqual(wordWrap("a\r\nb", 10), "a\nb");
      assert.strictEqual(wordWrap("a\rb", 10), "a\nb");
      assert.strictEqual(wordWrap("a\r\n\r\nb", 10), "a\n\nb");
      assert.strictEqual(wordWrap("a\u{2028}b\u{2029}c", 10), "a\nb\nc");
    });

    test("should normalize line breaks to newlineChar", () => {
      assert.strictEqual(
        wordWrap("a\r\nb\nc", 10, { newlineChar: "\r\n" }),
        "a\r\nb\r\nc",
      );
    });
  });

  describe("long words", () => {
    test("should not break long words by default", () => {
      assert.strictEqual(
        wordWrap(`a ${LONG_WORD} b`, 10),
        `a\n${LONG_WORD}\nb`,
      );
    });

    test("should break long words when enabled", () => {
      assert.strictEqual(
        wordWrap(LONG_WORD, 10, { breakLongWords: true }),
        "supercalif\nragilistic\nexpialidoc\nious",
      );
    });

    test("should start long words on a new line when breaking", () => {
      assert.strictEqual(
        wordWrap(`ab ${LONG_WORD} cd`, 10, { breakLongWords: true }),
        "ab\nsupercalif\nragilistic\nexpialidoc\nious cd",
      );
    });

    test("should not break words that fit", () => {
      assert.strictEqual(
        wordWrap("aaaa bbbbbbbbbb", 10, { breakLongWords: true }),
        "aaaa\nbbbbbbbbbb",
      );
    });

    test("should break leading whitespace with the first word", () => {
      assert.strictEqual(
        wordWrap("  abcdefgh", 4, { breakLongWords: true }),
        "  ab\ncdef\ngh",
      );
    });

    test("should drop leading whitespace not fitting with the first character", () => {
      assert.strictEqual(wordWrap("      ab", 4, { breakLongWords: true }), "ab");
      assert.strictEqual(
        wordWrap("      ab", 4, { breakLongWords: true, indent: 2 }),
        "  ab",
      );
    });

    test("should never start a line with a hard hyphen when breaking", () => {
      assert.strictEqual(
        wordWrap("abc-def", 3, { breakLongWords: true }),
        "ab\nc-\ndef",
      );
      assert.strictEqual(
        wordWrap("x abcd-ef", 4, { breakLongWords: true }),
        "x\nabc\nd-ef",
      );
      assert.strictEqual(wordWrap("a-", 1, { breakLongWords: true }), "a-");
      assert.strictEqual(
        wordWrap("abc\u{2010}def", 3, { breakLongWords: true }),
        "ab\nc\u{2010}\ndef",
      );
    });
  });

  describe("hyphens", () => {
    test("should break after hard hyphens between letters", () => {
      assert.strictEqual(
        wordWrap("a well-known co-op", 8),
        "a well-\nknown\nco-op",
      );
      assert.strictEqual(wordWrap("state-of-the-art", 9), "state-of-\nthe-art");
      assert.strictEqual(
        wordWrap("well\u{2010}known", 6),
        "well\u{2010}\nknown",
      );
    });

    test("should keep hard hyphens on the same line when fitting", () => {
      assert.strictEqual(wordWrap("well-known", 10), "well-known");
    });

    test("should not break around hyphens not between letters", () => {
      assert.strictEqual(
        wordWrap("--flag -1 a-1 1-a", 1),
        "--flag\n-1\na-1\n1-a",
      );
      assert.strictEqual(wordWrap("a--b", 1), "a--b");
    });

    test("should not break at non-breaking hyphens", () => {
      assert.strictEqual(wordWrap("well\u{2011}known", 5), "well\u{2011}known");
    });

    test("should break after hard hyphens regardless of hyphens option", () => {
      assert.strictEqual(
        wordWrap("well-known", 6, { hyphens: "none" }),
        "well-\nknown",
      );
    });

    test("should break at soft hyphens with a visible hyphen", () => {
      assert.strictEqual(
        wordWrap("hy\u{AD}phen\u{AD}ation", 6),
        "hy-\nphen-\nation",
      );
      assert.strictEqual(
        wordWrap("a hy\u{AD}phen\u{AD}ation", 9),
        "a hyphen-\nation",
      );
    });

    test("should keep room for the soft hyphen", () => {
      assert.strictEqual(wordWrap("ab cd\u{AD}ef", 5), "ab\ncdef");
      assert.strictEqual(wordWrap("ab cd\u{AD}ef", 6), "ab cd-\nef");
    });

    test("should remove unused soft hyphens", () => {
      assert.strictEqual(
        wordWrap("hy\u{AD}phen\u{AD}ation", 20),
        "hyphenation",
      );
    });

    test("should handle consecutive, leading and trailing soft hyphens", () => {
      assert.strictEqual(
        wordWrap("\u{AD}ab\u{AD}\u{AD}cd\u{AD}", 3),
        "ab-\ncd",
      );
      assert.strictEqual(wordWrap("a \u{AD} b", 10), "a b");
      assert.strictEqual(wordWrap("\u{AD}", 10), "");
    });

    test("should ignore and remove soft hyphens with hyphens none", () => {
      assert.strictEqual(
        wordWrap("hy\u{AD}phen\u{AD}ation", 6, { hyphens: "none" }),
        "hyphenation",
      );
      assert.strictEqual(wordWrap("\u{AD}", 10, { hyphens: "none" }), "");
    });

    test("should count soft hyphens as zero width", () => {
      assert.strictEqual(wordWrap("ab\u{AD}cd ef", 5), "abcd\nef");
    });

    test("should combine soft and hard hyphens", () => {
      assert.strictEqual(
        wordWrap("co\u{AD}op-er\u{AD}ate", 4),
        "co-\nop-\ner-\nate",
      );
    });

    test("should overflow when the soft hyphen cannot fit", () => {
      assert.strictEqual(wordWrap("abcd\u{AD}ef", 4), "abcd-\nef");
    });

    test("should keep room for the soft hyphen when breaking long words", () => {
      assert.strictEqual(
        wordWrap("abcd\u{AD}ef", 4, { breakLongWords: true }),
        "abc\ndef",
      );
      assert.strictEqual(
        wordWrap("abcdefgh\u{AD}ij", 4, { breakLongWords: true }),
        "abcd\nefg\nhij",
      );
      assert.strictEqual(
        wordWrap("ab\u{AD}c", 1, { breakLongWords: true }),
        "a\nb-\nc",
      );
    });

    test("should not break hyphens with global=false after the first line", () => {
      assert.strictEqual(
        wordWrap("ab-cd ef-gh", 3, { global: false }),
        "ab-\ncd ef-gh",
      );
    });
  });

  describe("indentation", () => {
    test("should indent all lines with uniform indentation", () => {
      assert.strictEqual(
        wordWrap("aaaa bbbb cccc dddd", 11, { indent: 2 }),
        "  aaaa bbbb\n  cccc dddd",
      );
    });

    test("should keep indented lines within length", () => {
      const result = wordWrap(TEST_STRING, 40, { indent: 4 });
      const lines = result.split("\n");
      assert.ok(
        lines.every((line) => line.startsWith(" ".repeat(4)) || line === ""),
      );
      assert.ok(getLineWidths(result).every((width) => width <= 40));
    });

    test("should not double indent lines after a line break", () => {
      assert.strictEqual(
        wordWrap("aaaa\nbbbb", 10, { indent: 2 }),
        "  aaaa\n  bbbb",
      );
    });

    test("should not indent empty lines", () => {
      assert.strictEqual(
        wordWrap("aaaa\n\nbbbb", 10, { indent: 2 }),
        "  aaaa\n\n  bbbb",
      );
      assert.strictEqual(wordWrap("", 10, { indent: 2 }), "");
    });

    test("should apply different indentation to first line vs rest", () => {
      const result = wordWrap(TEST_STRING, 40, {
        indent: 2,
        indentFirst: 4,
        trim: true,
      });
      const [first, ...rest] = result.split("\n");
      assert.strictEqual(first, `${" ".repeat(4)}Article 11.`);
      assert.ok(rest.every((line) => /^ {2}\S/.test(line) || line === ""));
      assert.ok(getLineWidths(result).every((width) => width <= 40));
    });

    test("should create a hanging indent", () => {
      assert.strictEqual(
        wordWrap("aaaa bbbb cccc dddd", 9, { indent: 4, indentFirst: 0 }),
        "aaaa bbbb\n    cccc\n    dddd",
      );
    });

    test("should only indent first line", () => {
      assert.strictEqual(
        wordWrap("aaaa bbbb cccc dddd", 9, { indent: 0, indentFirst: 4 }),
        "    aaaa\nbbbb cccc\ndddd",
      );
    });

    test("should accept string indentation", () => {
      assert.strictEqual(
        wordWrap("aaaa bbbb cccc", 8, { indent: "> " }),
        "> aaaa\n> bbbb\n> cccc",
      );
      assert.strictEqual(
        wordWrap("aaaa bbbb cccc", 8, { indent: "  ", indentFirst: "- " }),
        "- aaaa\n  bbbb\n  cccc",
      );
    });

    test("should measure string indentation in graphemes", () => {
      assert.strictEqual(
        wordWrap("aaaa bbbb", 6, { indent: "→ " }),
        "→ aaaa\n→ bbbb",
      );
    });

    test("should fit at least one character when indent fills the line", () => {
      assert.strictEqual(wordWrap("ab cd", 4, { indent: 4 }), "    ab\n    cd");
      assert.strictEqual(
        wordWrap("abc", 2, { indent: 4, breakLongWords: true }),
        "    a\n    b\n    c",
      );
    });
  });

  describe("trim", () => {
    test("should preserve leading whitespace by default", () => {
      assert.strictEqual(wordWrap("  aaaa", 10), "  aaaa");
      assert.strictEqual(wordWrap("aaaa\n  bbbb", 10), "aaaa\n  bbbb");
    });

    test("should count leading whitespace in line length", () => {
      assert.strictEqual(wordWrap("  aaaa bbbb", 8), "  aaaa\nbbbb");
    });

    test("should trim lines when enabled", () => {
      assert.strictEqual(
        wordWrap("  line1   \n  line2  ", 10, { trim: true }),
        "line1\nline2",
      );
    });

    test("should not trim indentation", () => {
      assert.strictEqual(
        wordWrap("  aaaa", 10, { indent: 2, trim: true }),
        "  aaaa",
      );
    });

    test("should return empty lines for whitespace-only lines", () => {
      assert.strictEqual(wordWrap(" ".repeat(3), 10), "");
      assert.strictEqual(wordWrap("a\n   \nb", 10), "a\n\nb");
    });
  });

  describe("global", () => {
    test("should only wrap the first line if global=false", () => {
      assert.strictEqual(
        wordWrap("aaaa bbbb cccc dddd", 5, { global: false }),
        "aaaa\nbbbb cccc dddd",
      );
    });

    test("should not wrap subsequent input lines if global=false", () => {
      assert.strictEqual(
        wordWrap("aaaa bbbb\ncccc dddd", 5, { global: false }),
        "aaaa\nbbbb\ncccc dddd",
      );
      assert.strictEqual(
        wordWrap("aaaa\ncccc dddd", 5, { global: false }),
        "aaaa\ncccc dddd",
      );
    });

    test("should combine global=false with indentFirst", () => {
      assert.strictEqual(
        wordWrap("aaaa bbbb cccc", 10, { global: false, indentFirst: 5 }),
        `${" ".repeat(5)}aaaa\nbbbb cccc`,
      );
    });

    test("should treat the first non-empty line as the first line", () => {
      assert.strictEqual(
        wordWrap("\naaaa bbbb cccc", 5, { global: false }),
        "\naaaa\nbbbb cccc",
      );
      assert.strictEqual(
        wordWrap("   \naaaa bbbb", 5, { global: false, indentFirst: 2 }),
        "\n  aaaa\nbbbb",
      );
    });
  });

  describe("newlineChar", () => {
    test("should use custom newline character", () => {
      const result = wordWrap(TEST_STRING_SHORT, 20, { newlineChar: "|" });
      assert.strictEqual(result, "the quick brown fox|jumps over the lazy|dog");
    });

    test("should handle newlineChar contained in the input", () => {
      assert.strictEqual(
        wordWrap("a.b c.d", 3, { newlineChar: "." }),
        "a.b.c.d",
      );
      assert.strictEqual(
        wordWrap("a.b c.d", 3, { newlineChar: ".", indent: 1 }),
        " a.b. c.d",
      );
    });
  });

  describe("Unicode", () => {
    test("should count no-break spaces as part of words", () => {
      assert.strictEqual(wordWrap("100\u{A0}km away", 6), "100\u{A0}km\naway");
      assert.strictEqual(
        wordWrap("a\u{202F}b\u{2007}c d", 5),
        "a\u{202F}b\u{2007}c\nd",
      );
    });

    test("should break at other Unicode whitespace", () => {
      assert.strictEqual(wordWrap("aaaa\u{3000}bbbb", 5), "aaaa\nbbbb");
    });

    test("should break at zero width spaces", () => {
      assert.strictEqual(wordWrap("a\u{200B}b", 1), "a\nb");
      assert.strictEqual(wordWrap("aa\u{200B}bb", 10), "aa\u{200B}bb");
    });

    test("should not break at zero width no-break spaces", () => {
      assert.strictEqual(wordWrap("a\u{FEFF}b", 1), "a\u{FEFF}b");
    });

    test("should measure length in graphemes", () => {
      assert.strictEqual(wordWrap("éé éé", 5), "éé éé");
      assert.strictEqual(
        wordWrap("e\u{301}e\u{301} e\u{301}e\u{301}", 5),
        "e\u{301}e\u{301} e\u{301}e\u{301}",
      );
      assert.strictEqual(wordWrap("😀😀 😀😀", 5), "😀😀 😀😀");
      assert.strictEqual(
        wordWrap("👨\u{200D}👩\u{200D}👧 👨\u{200D}👩\u{200D}👧", 3),
        "👨\u{200D}👩\u{200D}👧 👨\u{200D}👩\u{200D}👧",
      );
    });

    test("should measure a combining mark with its preceding space", () => {
      assert.strictEqual(wordWrap("a \u{301}b", 3), "a \u{301}b");
    });

    test("should measure Latin Extended and non-Latin scripts", () => {
      assert.strictEqual(wordWrap("łódź żółw", 4), "łódź\nżółw");
      assert.strictEqual(wordWrap("日本語 日本語", 7), "日本語 日本語");
      assert.strictEqual(
        wordWrap("tiếng việt", 6, { breakLongWords: true }),
        "tiếng\nviệt",
      );
    });

    test("should not split graphemes when breaking long words", () => {
      assert.strictEqual(
        wordWrap("😀😀😀", 2, { breakLongWords: true }),
        "😀😀\n😀",
      );
      assert.strictEqual(
        wordWrap("e\u{301}e\u{301}e\u{301}", 2, { breakLongWords: true }),
        "e\u{301}e\u{301}\ne\u{301}",
      );
      assert.strictEqual(
        wordWrap("👨\u{200D}👩\u{200D}👧👨\u{200D}👩\u{200D}👧", 1, {
          breakLongWords: true,
        }),
        "👨\u{200D}👩\u{200D}👧\n👨\u{200D}👩\u{200D}👧",
      );
    });
  });

  describe("input validation", () => {
    test("should handle empty string", () => {
      assert.strictEqual(wordWrap("", 10), "");
    });

    test("should coerce non-string inputs", () => {
      assert.strictEqual(wordWrap(null, 10), "null");
      assert.strictEqual(wordWrap(undefined, 10), "undefined");
      assert.strictEqual(wordWrap(123, 10), "123");
      assert.strictEqual(wordWrap(1234, 2, { breakLongWords: true }), "12\n34");
    });

    test("should handle a length of 1", () => {
      assert.strictEqual(wordWrap("a b c", 1), "a\nb\nc");
    });

    test("should not wrap with an infinite length", () => {
      assert.strictEqual(
        wordWrap(TEST_STRING, Infinity),
        TEST_STRING.replaceAll(/ +$/gm, ""),
      );
    });

    test("should handle non-integer lengths", () => {
      assert.strictEqual(wordWrap("ab cd", 5.5), "ab cd");
      assert.strictEqual(
        wordWrap("abcd", 2.5, { breakLongWords: true }),
        "ab\ncd",
      );
      assert.strictEqual(
        wordWrap("😀😀😀😀", 2.5, { breakLongWords: true }),
        "😀😀\n😀😀",
      );
    });

    test("should throw on invalid length", () => {
      assert.throws(() => wordWrap("a", 0), RangeError);
      assert.throws(() => wordWrap("a", -1), RangeError);
      assert.throws(() => wordWrap("a", NaN), RangeError);
      assert.throws(() => wordWrap("a", null), RangeError);
    });
  });
});
