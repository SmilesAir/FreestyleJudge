const webpack = require("webpack");
const path = require("path");

module.exports = (env, argv) => {
  return {
    entry: path.resolve(__dirname, "./source/index.js"),
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: ["babel-loader"],
        },
        {
          test: /\.css$/i,
          use: ["style-loader", "css-loader"],
        },
        {
          test: /\.less$/i,
          use: [
            // compiles Less to CSS
            "style-loader",
            "css-loader",
            "less-loader",
          ],
        },
      ],
    },
    resolve: {
      extensions: ["*", ".js", ".jsx"],
    },
    output: {
      path: path.resolve(__dirname, "./dist"),
      filename: "bundle.js",
    },
    plugins: [
      new webpack.DefinePlugin({
          __STAGE__: JSON.stringify(env.production ? "PRODUCITON" : "DEVELOPMENT"),
      }),
    ],
    devServer: {
      static: path.resolve(__dirname, "./dist"),
      hot: true,
      historyApiFallback: true,

    },
    performance: {
      hints: false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000
    },
  }
}