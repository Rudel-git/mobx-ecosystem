import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import external from 'rollup-plugin-peer-deps-external';
import dts from "rollup-plugin-dts";

//const packageJson = require('./package.json');

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.js',
        format: 'esm',
        sourcemap: false,
      }
    ],
    external: ['mobx', '@tanstack/react-query'],
    plugins: [
      external(), 
      // resolve(),
      typescript({ tsconfig: `./tsconfig.json` }), 
      terser()
    ]
  }, 
  // {
  //   input: 'dist/esm/types/index.d.ts',
  //   output: [{ file: 'dist/index.d.ts', format: "esm" }],
  //   external: [/\.css$/],
  //   plugins: [dts()],
  // },
];
