//Converter Class 
var Converter = require("csvtojson").Converter;
var Iconv = require('iconv').Iconv;
var fs = require('fs');


var multer  = require('multer');
var express = require('express');
var app = express();

var upload = multer({ dest: 'uploads/' });


var fileUpload = upload.fields([{ name: 'gd', maxCount: 1 }, { name: 'redmine', maxCount: 1 }]);

app.post('/', fileUpload, function (req, res, next) {
	// intersectResult(redmine_file, gd_file, function(str) {
		// res.send(str);
	// });
	console.log(req.files);
	
	var redmine_converter = new Converter({ delimiter: ';' });
	var redmine_file = fs.readFileSync(req.files['redmine'][0].path);

	var gd_converter = new Converter({});
	var gd_file = fs.readFileSync(req.files['gd'][0].path, "utf-8");

	redmine_file = new Iconv('cp1251', 'utf-8').convert(redmine_file).toString();
	gd_file = skipLines(gd_file, 2);

	intersectResult(redmine_file, gd_file, redmine_converter, gd_converter, function (s) {
		fs.writeFileSync('report.csv', s);
		res.sendFile(__dirname + '/report.csv');
	});

});

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/index.html');
});

app.listen(3756, function () {
  console.log('Example app listening on port 3756!');
});


function has(g_data, r_data) {
	return g_data.name.indexOf(r_data.first_name) >=0 && g_data.name.indexOf(r_data.last_name) >= 0;
}

function skipLines(str, n) {
	var splitted = str.split('\n');
	return splitted.slice(n).join('\n');
}


function intersectResult(redmine_file, gd_file, redmine_converter, gd_converter, cb) {
	redmine_converter.fromString(redmine_file, function (err, res) {
		var redmine_data = res
			.map(function (entry) { 
				var name_str = entry['Пользователь'];
				return {
					first_name: name_str.split(' ')[1],
					last_name: name_str.split(' ')[0],
					time: entry['Общее время']
				};
			});

		gd_converter.fromString(gd_file, function (err, res) {
			var gd_data = res
				.map(function(entry) {
					return {
						name: entry['ФИО'],
						time: entry['ЧЧ']
					}
				})
				.filter(function(data) {
					return data.name && data.name.length;
				});

			gd_data = gd_data.map(function(g_data) {
				redmine_data.map(function (r_data) {
					if (has(g_data, r_data)) {
						g_data.new_time = r_data.time;
					}
				})
				return g_data;
			});

			cb(
				'ФИО,ЧЧ было, ЧЧ стало\n' + 
				gd_data.map(function(data) {
					return data.name + ';' + (data.time && ('' + data.time)) + ';' + (data.new_time ? data.new_time : '');
				}).join('\n')
			);

		});
	});
}
 
//read from file 
