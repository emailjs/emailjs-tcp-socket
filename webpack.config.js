const path = require('path')

const test = {
  entry: './test/ws/index.js',
  output: {
    path: path.resolve(__dirname, 'test', 'ws'),
    filename: 'index.comp.js'
  },
  module: {
    rules: [{
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['babel-preset-env']
        }
      }
    }]
  }
}

const worker = {
  entry: './src/tls-worker.js',
  output: {
    path: path.resolve(__dirname, 'res'),
    filename: 'tls.worker.js'
  },
  module: {
    rules: [{
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['babel-preset-env']
        }
      }
    }]
  }
}

module.exports = [worker, test]
