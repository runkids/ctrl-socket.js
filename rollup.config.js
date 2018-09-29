import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import {uglify} from 'rollup-plugin-uglify';

export default {
	entry: 'src/ctrlsocket.js',
	dest: 'dist/ctrlsocket.min.js',
	moduleName: 'CtrlSocket',
	format: 'umd',
	plugins: [
		resolve({
			jsnext: true,
			main: true,
			browser: true,
		}),
		commonjs(),
		babel({
			exclude: 'node_modules/**',
		}),
		uglify()
	],
};