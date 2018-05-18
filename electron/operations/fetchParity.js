// Copyright 2015-2018 Parity Technologies (UK) Ltd.
// This file is part of Parity.
//
// SPDX-License-Identifier: MIT

const { app } = require('electron');
const axios = require('axios');
const { download } = require('electron-dl');
const fs = require('fs');
const util = require('util');

const { defaultParityPath } = require('./doesParityExist');
const handleError = require('./handleError');
const { parity: { channel } } = require('../../package.json');

const fsChmod = util.promisify(fs.chmod);

const getArch = () => {
  switch (process.platform) {
    case 'darwin':
    case 'win32':
      return 'x86_64';
    default: {
      switch (process.arch) {
        case 'arm':
          return 'arm';
        case 'arm64':
          return 'aarch64';
        case 'x32':
          return 'i686';
        default:
          return 'x86_64';
      }
    }
  }
};

const getOs = () => {
  switch (process.platform) {
    case 'darwin':
      return 'darwin';
    case 'win32':
      return 'windows';
    default:
      return 'linux';
  }
};

// Fetch parity from https://vanity-service.parity.io/parity-binaries
module.exports = mainWindow =>
  axios
    .get(
      `https://vanity-service.parity.io/parity-binaries?version=${channel}&os=${getOs()}&architecture=${getArch()}`
    )
    .then(response =>
      response.data[0].files.find(
        ({ name }) => name === 'parity' || name === 'parity.exe'
      )
    )
    .then(({ downloadUrl }) =>
      // This will install parity into defaultParityPath()
      download(mainWindow, downloadUrl, {
        directory: app.getPath('userData'),
        onProgress: progress =>
          mainWindow.webContents.send('parity-download-progress', progress) // Notify the renderers
      })
    )
    .then(() => fsChmod(defaultParityPath(), '755'))
    .then(() => defaultParityPath()) // Return the install path
    .catch(err => {
      handleError(err, 'An error occured while fetching parity.');
    });
