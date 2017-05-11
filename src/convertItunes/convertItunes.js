/* eslint class-methods-use-this:
[ "error",
  {"exceptMethods": ["checkTypes", "isArray", "fillWithNewExt", "convert", "throwIfMissing"] }
] */

import LastFM from 'last-fm';
import ffmetadata  from 'ffmetadata';
import async  from 'async';

class ConvertItunes {
  constructor(
    apiKey = this.throwIfMissing(),
    mp3Files = this.throwIfMissing()
  ) {
    this.isString(apiKey);
    this.isArray(mp3Files);
    this.apiKey = apiKey;
    this.mp3Files = mp3Files;
    this.thumbnails = [];
  }

  /**
    * It is a getter, should show all params
  */
  get getAttributes() {
    return `ApiKey: ${this.apiKey} | mp3Files: ${this.mp3Files}!`;
  }

  /**
    * It is a setter for mp3Files path
    * @param {string} mp3Files path
  */
  set changeMp3Files(mp3Files) {
    this.mp3Files = mp3Files;
  }

  /**
    * It is a setter for apiKey
    * @param {string} api key of last.fm api.
  */
  set changeApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  /**
    * Check if params is an array
    * @param {any} value be a arrauy
  */
  isArray(obj) {
    if ( !(!!obj && obj.constructor === Array) ) {
      throw new Error('Wrong type parameter.');
    }
  }

  /**
    * Check if params is a string
    * @param {any} value be a string
  */
  isString(value) {
    if (typeof value !== 'string' && !(value instanceof String)) {
      throw new Error('Wrong type parameter.');
    }
  }

  /**
    * Set default error if parameter is missing
  */
  throwIfMissing() {
    throw new Error('Missing parameter.');
  }

  /**
    * Get mp3 metadata. 
    * @param {string} file path (eg. /path/to/song.mp3)
    * @param {getMetadata~requestCallback} callback
  */

  getMetadata(file, callback) {
    ffmetadata.read(file, function(err, data) {
      if (err) callback(err);
      else callback(null, data);
    });
  }

  /**
    * Write metadata to an mp3 file.
    * @param {string} file path (eg. /path/to/song.mp3)
    * @param {getMetadata~requestCallback} callback
  */

  setMetadata(file, metadata, options, callback) {
    ffmetadata.write(file, metadata, options, function(err) {
      if (err) callback(err);
      else callback(null, 'Data written');
    });
  }

  /**
    * Format file path as track name.
    * @param {string} file path (eg. /path/to/song.mp3)
  */

  getTrackWithFormat(file) {
    const lastDot = file.lastIndexOf('.');
    let track = file.split('-').pop().substring(0, lastDot).replace(/\([^()]*\)/g, '').split('.')[0]; // TODO: remove string between paretheses.
    const firstDigit = track[0].match(/(\d+)/);
    if (firstDigit && firstDigit !== -1) {
      const regex = new RegExp(firstDigit[0], 'g');
      track = track.replace(regex, ''); // TODO: remove numbers.
    }
    
    return track.normalize('NFD').replace(/[\u0300-\u036f]/g, "").trim(); // TODO: remove accents.
  }

  /**
    * Search track in LastFM API and filling this data on metadata of mp3.
    * @param {fillMetadataToMp3~requestCallback} callbackEnd
  */

  fillMetadataToMp3(mp3Files, callbackEnd) {
    const that = this;
    const lastfm = new LastFM(this.apiKey, 'MyApp/1.0.0 (http://example.com)');
    async.forEach(mp3Files, (mp3, callbackEach) => {
      const file = mp3.file;
      const path = mp3.path;
      async.waterfall([
        (callback) => {
          that.getMetadata(path, callback);
        },
        (meta, callback) => {
          const track = this.getTrackWithFormat(file);
          lastfm.trackInfo({ track: track, artist: meta.artist }, (err, data) => {
            if (err) {
              callback(err);
            } else {
              if(data) {
                const album = data.album || '';
                const metadata = {
                  title: data.name,
                  artist: data.artist.name,
                  album: !!String(album) ? album.title : album,
                  track: !!String(album) ? album['@attr'].position : album,
                  comment: 'Apple Lossless created by mp3-to-itunes module.'
                };

                let options = {}
                if (!!String(album) && album.image[2]['#text'] !== '') { // TODO: Check if exist artwork.
                  options.attachments = [album.image[2]['#text']];
                  this.thumbnails.push(album.image[2]['#text']);
                } else {
                  if (this.thumbnails.length) {
                    const thumbnails = this.thumbnails.reduce(function(prev, cur) {
                      prev[cur] = (prev[cur] || 0) + 1;
                      return prev;
                    }, {});
                    if (Object.keys(thumbnails).length === 1) { // TODO: If there is only one artwork I assume the directory is an album.
                      options.attachments = Object.keys(thumbnails);
                    }
                  }
                }
                this.setMetadata(path, metadata, options, callback)
              } else {
                callback('Something is wrong.');
              }
            }
          });
        },
      ],
      (err, results) => {
        if (err) {
          callbackEach(err);
        } else {
          callbackEach(null, results);
        }
      });    
    },
    (err, results) => {
      if (err) {
        callbackEnd(err);
      } else {
        callbackEnd(null, {
          status: 'OK',
          message: 'The mp3 format is already iTunes.'
        });
      }
    });
  }

  /**
    * It is a module initialize
    * @param {init~requestCallback} callback
  */
  init(callback) {
    this.fillMetadataToMp3(this.mp3Files ,(err, success) => {
      if (err) {
        callback(err);
      } else {
        callback(null, success);
      }
    });
  }
}

export default ConvertItunes;
