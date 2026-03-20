/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

/** @param {Record<string,string>} env */
module.exports = (env, argv) => {
  const isProd = argv.mode === 'production';

  /** @type {import('webpack').Configuration[]} */
  return [
    // ── Extension host (Node.js) ──────────────────────────────
    {
      name: 'extension',
      target: 'node',
      mode: argv.mode || 'none',
      entry: './src/extension.ts',
      output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'extension.js',
        libraryTarget: 'commonjs2',
        clean: isProd, // wipe dist/ on production builds
      },
      externals: {
        vscode: 'commonjs vscode',
      },
      resolve: {
        extensions: ['.ts', '.js'],
      },
      module: {
        rules: [
          {
            test: /\.ts$/,
            exclude: [/node_modules/, /src\/webview/],
            use: [
              {
                loader: 'ts-loader',
                options: { configFile: 'tsconfig.json' },
              },
            ],
          },
        ],
      },
      devtool: isProd ? false : 'nosources-source-map',
    },

    // ── Webview (Browser / React) ─────────────────────────────
    {
      name: 'webview',
      target: 'web',
      mode: argv.mode || 'none',
      entry: './src/webview/index.tsx',
      output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'webview.js',
      },
      resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
      },
      module: {
        rules: [
          {
            test: /\.tsx?$/,
            exclude: /node_modules/,
            use: [
              {
                loader: 'ts-loader',
                options: { configFile: 'tsconfig.webview.json' },
              },
            ],
          },
          {
            test: /\.css$/,
            use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader'],
          },
        ],
      },
      plugins: [
        new MiniCssExtractPlugin({
          filename: 'webview.css',
        }),
      ],
      devtool: isProd ? false : 'nosources-source-map',
      performance: {
        hints: false,
      },
    },
  ];
};
