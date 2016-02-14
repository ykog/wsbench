var express = require('express');
var router = express.Router();

/* GET home page. */

router.get('/', function(req, res) {
  console.log('request header:' + req.get('XX-Remote-User')) ;
  res.render('index', { title: 'Express' });
});

module.exports = router;
