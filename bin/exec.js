#! /usr/bin/env node
var shell = require('shelljs');
var ConvertItunesCommand = require('../');

var mp3Files = shell.find('.').filter(function(file) {
  return file.match(/\.mp3$/);
});

for (var i = 0, len = mp3Files.length; i < len; i++) {
  mp3Files[i] = {
    path: mp3Files[i],
    file: mp3Files[i].split('/').pop()
  };
}

if (mp3Files.length) {
  var ConvertItunes = new ConvertItunesCommand(process.argv[2].split('=').pop(), mp3Files);
  ConvertItunes.init( function(err, response) {
    if (err) {
      console.log(err);
    } else {
      console.log('status: ', response.status);
      console.log('message: ', response.message);
      shell.exit(1);
    }
  });
} else {
  console.error('There are not mp3 files in this directory');
  shell.exit(1);
}

