const path = require('path')

module.exports = {
  entry: './src/tls-worker.js',
  output: {
    path: path.resolve(__dirname, 'res'),
    filename: 'tls.worker.js'
  },
  node: false,
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
