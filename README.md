# Node.js Temporary Map

Javascript Map with temporary elements and additional utility methods.

```js
const TempMap = require('./tempmap.js');

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
