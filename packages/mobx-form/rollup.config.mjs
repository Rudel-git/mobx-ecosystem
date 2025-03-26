import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import resolve from '@rollup/plugin-node-resolve';
import external from 'rollup-plugin-peer-deps-external';
import dts from "rollup-plugin-dts";

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.dev.js',
        format: 'esm',
        sourcemap: true,
      }
    ],
    external: ['mobx'],
    plugins: [
      external(), 
      typescript({ tsconfig: `./tsconfig.json` }), 
    ]
  },
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.prod.js',
        format: 'esm',
        sourcemap: false,
      }
    ],
    external: ['mobx'],
    plugins: [
      external(), 
      typescript({ tsconfig: `./tsconfig.json` }), 
      terser()
    ]
  },  
];
