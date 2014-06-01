# png-stash-mux

[![NPM](https://nodei.co/npm/png-stash-mux.png)](https://nodei.co/npm/png-stash-mux/)

A multiplexing wrapper over `png-stash`, this low level tool can read
and write data in the least significant bits of a series of PNG
images.

Takes a list of PNG files and exposes an array-like-ish data structure
to read and write buffers and bytes.

## Quick Example 1: Write Data

```javascript
var pngStashMux = require('png-stash-mux');

var stash = pngStashMux(['steve.png', 'benny.png'], function(err, stash) {
    if (err) throw new Error(err);

    stash.write("Itsa mee! Ontario!", function(err) {
        if (err) throw new Error(err);
        stash.save(finished);
    });

    function finished(err) {
        if (err) throw new Error(err);
        console.log("Message stored!");
    }); 
});
```

## Quick Example 2: Read Data

```javascript
var pngStashMux = require('png-stash-mux');

var stash = pngStashMux(['steve.png', 'benny.png'], function(err, stash) {
    if (err) throw new Error(err);

    stash.read(0, 18, // 18 is length of message from example 1.
               function(err, message) {
        if (err) throw new Error(err);
        console.log(message);
    });
});
```

<a name="download" />
## Download

For [Node.js](http://nodejs.org/), use [npm](http://npmjs.org/):

    npm install png-stash-mux

## Documentation

### Constructor

* [pngStashMux](#pngStashMux)

### Instance Functions

* [getByte](#getByte)
* [setByte](#setByte)
* [read](#read)
* [write](#write)
* [save](#save)

-----------------------------------

<a name="pngStashMux" />
## pngStashMux(pngFileNames, callback)

Scans and indexes the specified PNG files, and and yields a
reader-writer object with the following properties:

* length - Total number of bytes that can be hidden in the PNG files.
* getByte()
* setByte()
* write()
* read()
* save()

See below for documentation of the read-write functions.

__Arguments__

* pngFileNames - An array of file paths.  Each file path must be for an existing valid PNG file.
* callback - `function(err, stash)`.  If the PNGs file were successfully indexed, `err` will be `undefined`.  `stash` will be reader-writer object mentioned in description above.

__Example__

```javascript
var pngStashMux = require('png-stash-mux');

pngStashMux(["test1.png", "test2.png"], function(err, stash) {
  console.log("Available bytes: " + stash.length);
});
```

-----------------------------------

<a name="getByte" />
## stash.getByte(index, callback)

Reads a single byte from the "invisible" bits of the PNG files.

May trigger a `save()` of previously changed data.  See "Notes" below.

__Arguments__

* index - Position among all bytes composed by the PNGs' "invisible" bits.  Must be less than the `pngStashMux` instance's `length` property.
* callback - `function(err, byte)`.  `err` will be `undefined` if read was successful.  Otherwise it will represent an error.  `byte` is the read value.

__Example__

```javascript
var pngStashMux = require('png-stash-mux');

pngStashMux(["frame0.png", "frame1.png", "frame2.png"], function(err, stash) {
  stash.getByte(1000, function(err, b1) {
  stash.getByte(2000, function(err, b2) {
  stash.getByte(3000, function(err, b3) {
    if (b1 == 0xaa && b2 == 0x44 && b3 == 0xff) {
      console.log("Watermark detected!");
    } else {
      console.log("No watermark detected.");
    }
  })})});
});
```

-----------------------------------

<a name="setByte" />
## stash.setByte(index, value, callback)

Writes a single byte to the "invisible" bits of the PNGs, but does not
immediately save it to disk.  To save, call `save()`.

May trigger a `save()` of previously changed data.  See "Notes" below.

__Arguments__

* index - Position among all bytes composed by the PNGs' "invisible" bits.  Must be less than the `pngStash` instance's `length` property.
* value - Byte to store.  Must be an integer in the 8-bit range (`0 < value < 256`).
* callback - `function(err)`.  `err` will be `undefined` if save was successful.  Otherwise it will represent an error.

__Example__

```javascript
var pngStashMux = require('png-stash-mux');

pngStashMux(["frame0.png", "frame1.png", "frame2.png"], function(err, stash) {
  stash.setByte(1000, 0xaa);
  stash.setByte(2000, 0x44);
  stash.setByte(3000, 0xff);
  stash.save(function(err) {
    console.log(err || "Watermark inserted.");
  });
});
```

-----------------------------------

<a name="read" />
## stash.read(offset, length, callback)
## stash.read(offset, callback)
## stash.read(callback)

Reads a sequence of bytes from the PNGs' "invisible" bits, and returns
them as a `Buffer`.

May trigger a `save()` of previously changed data.  See "Notes" below.

__Arguments__

* offset - default=`0`. At which byte position to start reading from.
* length - default=`stash.length`.  How many bytes to read.
* callback - `function(err, data)`.  `err` will be `undefined` if save was successful.  Otherwise it will represent an error.  `data` is all requested bytes in a `Buffer`.

__Example__

```javascript
var pngStashMux = require('png-stash-mux');

pngStashMux(["bunny.png", "kitten.png"], function(err, stash) {
  var messageLength = stash.getByte(0) * 65536
                    + stash.getByte(1) * 256
                    + stash.getByte(2);
  var message = stash.read(messageLength, 3);
  console.log("Found message: " + message);
});
```

-----------------------------------

<a name="write" />
## stash.write(data, offset, length, callback)
## stash.write(data, offset, callback)
## stash.write(data, callback)

Writes a sequence of bytes to the PNGs' "invisible" bits, but does not
save to disk.  To save to disk, call `save()`.

May trigger a `save()` of previously changed data.  See "Notes" below.

__Arguments__

* data - Bytes to store in the PNGs.  Must be string or Buffer.  If string, will be UTF-8 encoded.
* offset - default=`0`.  At which byte position to start writing to.
* length - default=all.  How many bytes from `data` to write.  Be aware that the `.length` of a string may not correspond to the number of bytes in its resulting UTF-8 representation.
* callback - `function(err)`.  `err` will be `undefined` if save was successful.  Otherwise it will represent an error.

__Example__

```javascript
var pngStashMux = require('png-stash-mux');

pngStash(["bunny.png", "kitten.png"], function(err, stash) {
  var message = new Buffer("Hello there!");
  stash.setByte(0, message.length >> 16 & 0xff);
  stash.setByte(1, message.length >>  8 & 0xff);
  stash.setByte(2, message.length >>  0 & 0xff);
  stash.write(message, 3);
});
```

-----------------------------------

<a name="save" />
## stash.save(callback)

Stores the PNG data back into the files.  You want to call this
function after writing data to the `stash` instance.

May be triggered sproadically as a result of other operations.  See
"Notes" below for details.

__Arguments__

* callback - `function(err)`.  `err` will be `undefined` if save was successful.  Otherwise it will represent an error.

__Example__

// See examples for `stash.write()` and `stash.setByte()`.

# Notes

Will automatically save changes if an operation needs to cross file
boundaries.  This means that if you do not `save()` before shutting
down, you are likely to end up with a half-stored state.
