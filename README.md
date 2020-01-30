# rollup-plugin-webbundle

A Rollup plugin which generates [Web Bundles](https://wicg.github.io/webpackage/draft-yasskin-wpack-bundled-exchanges.html) output.

## Requirements

This plugin requires Node v8.0.0+ and Rollup v1.0.0+.

## Install

Using npm:

```console
npm install rollup-plugin-webbundle --save-dev
```

## Usage
This example assumes your application entry point is `src/index.js` and static files (including `index.html`) are located in `static` directory.
```js
/* rollup.config.js */
const webbundle = require('rollup-plugin-webbundle');

module.exports = {
  input: 'src/index.js',
  output: {
    dir: 'dist',
    format: 'esm'
  },
  plugins: [
    webbundle({
      baseURL: 'https://example.com/',
      static: { dir: 'static' }
    })
  ]
};
```

A WBN file `dist/out.wbn` should be written.

## Options
### `baseURL` (required)
Type: `string`

Specifies the URL prefix prepended to the file names in the bundle. This must be an absolute URL that ends with `/`.

### `primaryURL`
Type: `string`<br>
Default: baseURL

Specifies the bundle's main resource URL. If omitted, the value of the `baseURL` option is used.

### `static`
Type: `{ dir: String, baseURL?: string }`

If specified, files and subdirectories under `dir` will be added to the bundle. `baseURL` can be omitted and defaults to `Options.baseURL`.

### `output`
Type: `string`<br>
Default: `out.wbn`

Specifies the file name of the Web Bundle to emit.

## License
Licensed under the Apache-2.0 license.

## Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md) file.

## Disclaimer
This is not an officially supported Google product.
