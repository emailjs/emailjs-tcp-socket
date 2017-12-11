const path = require('path')

module.exports = {
  entry: './test/ws/index.js',
  output: {
    path: path.resolve(__dirname, 'test', 'ws'),
    filename: 'index.comp.js'
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
