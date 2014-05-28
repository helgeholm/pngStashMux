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
    if (!currentOpenPng || currentOpenPng.idx != fileIdx) {
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

  functions = {
    getByte: get
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
