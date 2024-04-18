import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.d.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.mp3/,
        type: 'asset/inline'
      },
      {
        test: /\.glb/,
        type: 'asset/inline'
      }
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
        three$: path.resolve(__dirname, "./node_modules/three/build/three.module.js"),
        bitecs$: path.resolve(__dirname, "./node_modules/bitecs/dist/index.mjs")
    }
  },
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
    assetModuleFilename: 'assets/[name]-[hash][ext][query]',
    module: true, // Enable ES module output
  },
  devtool: 'source-map',
  experiments: {
    outputModule: true, // Enable output module experiments
  },
  externals: {
    bitecs: 'bitecs',
    three: 'three',
    hubs: 'hubs'
  }
};