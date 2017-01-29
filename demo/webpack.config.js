const fs = require('fs');
const gracefulFs = require('graceful-fs');
gracefulFs.gracefulify(fs); // Fix copy-webpack-plugin: EMFILE: too many open files

const webpack = require('webpack');
const path = require('path');
const dateFormat = require('dateformat');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const BrowserSyncPlugin = require('browser-sync-webpack-plugin');
const pkg = require('../package.json');

/**
 * Get npm lifecycle event to identify the environment
 */
const ENV = process.env.npm_lifecycle_event;
const isProduction = ENV === 'demo:build';

const DEMO_DIST = path.resolve(__dirname, 'dist');

const config = {
  entry: path.resolve(__dirname, isProduction ? 'main-aot.ts' : 'main.ts'),
  output: {
    path: DEMO_DIST,
    filename: isProduction ? 'index.[hash].js' : 'index.js',
    chunkFilename: isProduction ? 'chunk.[id].[hash].js' : 'chunk.[id].js'
  },
  devtool: isProduction ? 'source-map' : 'eval-source-map',
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loaders: [
          'awesome-typescript-loader?{configFileName: "demo/tsconfig.json"}',
          'angular2-template-loader',
          'angular-router-loader' + (isProduction ? '?aot=true&genDir=demo' : '')
        ]
      },
      { test: /\.html$/, loaders: ['raw-loader'] },
      { test: /\.md$/, loader: 'html-loader?minimize=false!markdown-loader' },
    ]
  },
  stats: 'minimal', // Only output when errors or new compilation happen
  performance: {
    hints: false,
  },
  plugins: [
    new CleanWebpackPlugin([DEMO_DIST], {
      root: __dirname,
      verbose: true,
    }),
    new HtmlWebpackPlugin({
      template: '!!pug-loader!' + path.resolve(__dirname, 'index.pug'),
      baseHref: isProduction ? '/ng-lightning/' : '/',
    }),
    new webpack.DefinePlugin({
      'process.env': JSON.stringify({
        now: dateFormat(new Date(), 'dd mmm yyyy'),
        version: pkg.version,
        production: isProduction,
        pkg,
      }),
    }),
    new CopyWebpackPlugin([
      { from: path.resolve(__dirname, '../node_modules/@salesforce-ux/design-system/assets'), to: 'assets' },
      { from: path.resolve(__dirname, '../node_modules/prismjs/themes/prism-okaidia.css'), to: 'assets/prismjs' },
      { from: path.resolve(__dirname, 'img'), to: 'img' },
      { from: path.resolve(__dirname, 'index.css') },
    ]),
    new BrowserSyncPlugin({
      host: '0.0.0.0',
      port: 1111,
      open: false,
      server: {
        baseDir: [DEMO_DIST]
      },
      reloadDelay: 100,
      reloadDebounce: 300,
    }),

    // Workaround needed for angular 2 angular/angular#11580
    new webpack.ContextReplacementPlugin(
      // The (\\|\/) piece accounts for path separators in *nix and Windows
      /angular(\\|\/)core(\\|\/)(esm(\\|\/)src|src)(\\|\/)linker/,
      path.resolve(__dirname, '../src') // location of your src
    ),

    new webpack.LoaderOptionsPlugin({
      debug: !isProduction,
      minimize: isProduction
    }),
  ],
};

if (isProduction) {
  config.plugins.push(
    // Only emit files when there are no errors
    new webpack.NoEmitOnErrorsPlugin(),

    // Minify all javascript, switch loaders to minimizing mode
    new webpack.optimize.UglifyJsPlugin()
  );
}

module.exports = config;
