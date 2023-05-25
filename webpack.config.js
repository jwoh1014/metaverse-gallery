//import
const path = require('path')
const HtmlPlugin = require('html-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')
 //
 module.exports = {
  //파일을 읽어들이기 시작하는 진입점 설정
   entry: './js/main.js',
   //결과물(번들) 변환하는 설정
   output: {
    //path: path.resolve(__dirname, 'public'),
    //filename: 'index.js',
    clean : true
   },

   module: {
     rules: [
       {
         test: /\.s?css$/,
         use: [
          'style-loader',
          'css-loader',
          'postcss-loader',
          'sass-loader'
         ]
       }
     ]
   },

   plugins: [
    new HtmlPlugin({
      template: './index.html'
    }),
    new CopyPlugin({
      patterns: [
        {from: 'static'}
      ]
    })
   ],

   devServer:{
     host:'localhost'
   }
   
 }

  