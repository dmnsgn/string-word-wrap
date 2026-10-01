# string-word-wrap

[![npm version](https://img.shields.io/npm/v/string-word-wrap)](https://www.npmjs.com/package/string-word-wrap)
[![stability-stable](https://img.shields.io/badge/stability-stable-green.svg)](https://www.npmjs.com/package/string-word-wrap)
[![npm minzipped size](https://img.shields.io/bundlephobia/minzip/string-word-wrap)](https://bundlephobia.com/package/string-word-wrap)
[![dependencies](https://img.shields.io/librariesio/release/npm/string-word-wrap)](https://github.com/dmnsgn/string-word-wrap/blob/main/package.json)
[![types](https://img.shields.io/npm/types/string-word-wrap)](https://github.com/microsoft/TypeScript)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-fa6673.svg)](https://conventionalcommits.org)
[![styled with prettier](https://img.shields.io/badge/styled_with-Prettier-f8bc45.svg?logo=prettier)](https://github.com/prettier/prettier)
[![linted with eslint](https://img.shields.io/badge/linted_with-ES_Lint-4B32C3.svg?logo=eslint)](https://github.com/eslint/eslint)
[![license](https://img.shields.io/github/license/dmnsgn/string-word-wrap)](https://github.com/dmnsgn/string-word-wrap/blob/main/LICENSE.md)

Wrap a string to a maximum line length. Unicode-aware, with hyphen and soft hyphen breaking, and first-line or hanging indentation.

[![paypal](https://img.shields.io/badge/donate-paypal-informational?logo=paypal)](https://paypal.me/dmnsgn)
[![coinbase](https://img.shields.io/badge/donate-coinbase-informational?logo=coinbase)](https://commerce.coinbase.com/checkout/56cbdf28-e323-48d8-9c98-7019e72c97f3)
[![twitter](https://img.shields.io/twitter/follow/dmnsgn?style=social)](https://twitter.com/dmnsgn)
[![bluesky](https://img.shields.io/badge/-blue?logo=bluesky&label=Follow%20%40dmnsgn.me&style=social)](https://bsky.app/profile/dmnsgn.me)

## Installation

```bash
npm install string-word-wrap
```

## Usage

```js
import wordWrap from "string-word-wrap";

wordWrap("The quick brown fox jumps over the lazy dog", 20);
// The quick brown fox
// jumps over the lazy
// dog

wordWrap("--color  Enable colored output in the terminal", 26, {
  indent: 9,
  indentFirst: 0,
});
// --color  Enable colored
//          output in the
//          terminal

wordWrap("Quoted text to wrap", 10, { indent: "> " });
// > Quoted
// > text to
// > wrap

wordWrap("supercalifragilistic", 10, { breakLongWords: true });
// supercalif
// ragilistic

wordWrap("a well-known hy\u00ADphen\u00ADation", 11);
// a well-
// known hy-
// phenation
```

Lines break at whitespace, after hyphens between letters, and at soft hyphens (U+00AD), which render as `-` when used and are removed otherwise. Use a non-breaking hyphen (U+2011) or no-break space (U+00A0) to prevent a break.

Line length is measured in grapheme clusters (user-perceived characters): combining marks and emoji sequences count as one character and are never split. Display width (e.g. double-width CJK or emoji in terminals) is not accounted for.

### CSS equivalents

| Option                  | CSS                                                       |
| ----------------------- | --------------------------------------------------------- |
| `length`                | `width` (in `ch`)                                         |
| `indent`                | `padding-left` (in `ch`)                                  |
| `indentFirst`           | `text-indent` (in `ch`, relative to `indent`)             |
| `breakLongWords: false` | `overflow-wrap: normal`                                   |
| `breakLongWords: true`  | `overflow-wrap: break-word`                               |
| `hyphens: "manual"`     | `hyphens: manual`                                         |
| `hyphens: "none"`       | `hyphens: none`                                           |
| `trim: false`           | `white-space: pre-wrap` (whitespace at breaks is dropped) |
| `trim: true`            | `white-space: pre-wrap` + leading whitespace removed      |

## API

<!-- api-start -->

Auto-generated API content.

<!-- api-end -->

## License

MIT. See [license file](https://github.com/dmnsgn/string-word-wrap/blob/main/LICENSE.md).
