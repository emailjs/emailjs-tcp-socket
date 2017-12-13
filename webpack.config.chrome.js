const path = require('path')

module.exports = {
  entry: './test/chrome/chrome-integration.js',
  output: {
    path: path.resolve(__dirname, 'test', 'chrome'),
    filename: 'chrome-integration.comp.js'
  },
  node: {
    net: 'empty',
    tls: 'empty',
    Buffer: false,
    process: false
  },
  devtool: 'inline-source-map',
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
