# Node.js Temporary Map

Javascript Map with temporary elements and additional utility methods.

## Installation

```bash
npm install https://github.com/flipeador/node.js-temp-map
```

## Example

```js
const TempMap = require('@flipeador/node.js-temp-map');

const tmap = new TempMap();

tmap.set('foo', 'never expires');
tmap.set('foo', 'expires in 1 second', 1000); // set timer
tmap.set('foo', 'expires in less than a second', null); // keep current timer
tmap.set('foo', 'expires in 1 second'); // refresh timer
tmap.get('foo', false) // keep current timer
tmap.get('foo') // refresh timer
tmap.set('foo', 'never expires', 0); // remove timer

console.log(tmap);
```

```bash
TempMap(1) [Map] { 'foo' => 'never expires' }
```

## License

This project is licensed under the **GNU General Public License v3.0**. See the [license file](LICENSE) for details.
