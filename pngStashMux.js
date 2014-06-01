var async = require('async');
var pngStash = require('png-stash');

module.exports = function pngStashMux(files, cb) {
  var index = null;
  var currentOpenPng = null;

  function openFileFor(idx, cb) {
    if (idx < 0 || idx >= index.length)
      return cb(new Error('Index out of bounds (0 - ' + index.length + ')'));
    var fileIdx;
    for (fileIdx = index.files.length - 1;
         index.files[fileIdx].pos > idx;
         fileIdx--);

    if (currentOpenPng && currentOpenPng.idx == fileIdx)
      return cb();

    save(function(err) {
      if (err) return cb(err);
      pngStash(index.files[fileIdx].file, function(err, stash) {
        currentOpenPng = {
          idx: fileIdx,
          synced: true,
          stash: stash
        }
        cb();
      });
    });
  }

  function save(cb) {
    if (!currentOpenPng || currentOpenPng.synced) return cb();
    currentOpenPng.stash.save(cb);
  }

  function get(idx, cb) {
    openFileFor(idx, function(err) {
      if (err) return cb(err);
      var fileOffset = index.files[currentOpenPng.idx].pos;
      var val = currentOpenPng.stash.getByte(idx - fileOffset);
      cb(null, val);
    });
  }

  function set(idx, val, cb) {
    openFileFor(idx, function(err) {
      if (err) return cb(err);
      var filePos = index.files[currentOpenPng.idx].pos;
      currentOpenPng.stash.setByte(idx - filePos, val);
      currentOpenPng.synced = false;
      cb(null, val);
    });
  }

  function read(offset, length, cb) {
    if (length === undefined) { // read(cb)
      cb = offset;
      offset = 0;
      length = index.length; // read(offset, cb)
    }
    if (cb === undefined) {
      cb = length;
      length = index.length - offset;
    }
      
    if (offset + length > index.length)
      return cb("Read would go out of bounds: " +
                offset + " + " + length + " > " + index.length);

    openFileFor(offset, function(err) {
      if (err) return cb(err);
      var filePos = index.files[currentOpenPng.idx].pos;
      var fileLength = currentOpenPng.stash.length;
      var fileOffset = offset - filePos;
      var fileReadLength = length;
      if (fileReadLength + fileOffset > fileLength)
        fileReadLength = fileLength - fileOffset;
      var data = currentOpenPng.stash.read(fileOffset, fileReadLength);
      if (fileReadLength == length)
        return cb(null, data);
      read(offset + fileReadLength, length - fileReadLength, function(err, remData) {
        cb(null, Buffer.concat([data, remData]));
      });
    });
  }

  function write(writeData, offset, length, cb) {
    if (length === undefined) { // write(data, cb)
      cb = offset;
      offset = 0;
      length = writeData.length;
    }
    if (cb === undefined) { // write(data, offset, cb)
      cb = length;
      length = writeData.length;
    }

    if (offset + length > index.length)
      return cb("Write would go out of bounds: " +
                offset + " + " + length + " > " + index.length);

    if (length == 0)
      return cb();

    openFileFor(offset, function(err) {
      if (err) return cb(err);
      var filePos = index.files[currentOpenPng.idx].pos;
      var fileLength = currentOpenPng.stash.length;
      var fileOffset = offset - filePos;
      var fileWriteLength = length;
      if (fileWriteLength + fileOffset > fileLength)
        fileWriteLength = fileLength - fileOffset;
      currentOpenPng.stash.write(writeData, fileOffset, fileWriteLength);
      currentOpenPng.synced = false;
      if (fileWriteLength == length)
        return cb();
      var remainingData = writeData.slice(fileWriteLength);
      write(remainingData, offset + fileWriteLength, length - fileWriteLength, cb);
    });
  }
  
  functions = {
    write: write,
    read: read,
    getByte: get,
    setByte: set,
    save: save
  }

  scanFiles(files, function(err, _index) {
    if (err) return cb(err);
    index = _index;
    cb(null, functions);
  });
}

function scanFiles(files, cb) {
  var fileData = [];
  var currentPos = 0;
  async.eachSeries(files, function getFileStat(file, cb) {
    fileData.push({ 'file': file, 'pos': currentPos });
    pngStash(file, function(err, stash) {
      if (err) return cb(err);
      currentPos += stash.length;
      cb();
    });
  }, function done(err) {
    return cb(err, {
      'files': fileData,
      'length': currentPos
    });
  });
}
