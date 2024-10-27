var express = require('express');
var router = express.Router();

const fetch = require('node-fetch');
const City = require('../models/cities');

let weather = [
    "Beijing",
    "New Delhi",
    "Tokyo",
    "Moscow",
    "Jakarta",
    "Lima",
    "Seoul",
    "London",
    "Cairo",
    "Mexico City"
];

router.get("/weather", (req, res) => {
    res.json({ weather });
  });

// ROUTER POST ADD NEW CITY
router.post('/', (req, res) => {
	// Check if the city has not already been added
	City.findOne({ cityName: { $regex: new RegExp(req.body.cityName, 'i') } }).then(cityData => {
		if (cityData === null) {
			// Request OpenWeatherMap API for weather data
			fetch(`https://api.openweathermap.org/data/2.5/weather?q=${req.body.cityName}&appid=${process.env.OWM_API_KEY}&units=metric`)
				.then(res => res.json())
				.then(apiData => {
					// Creates new document with weather data
					const newCity = new City({
						cityName: req.body.cityName,
						main: apiData.weather[0].main,
						description: apiData.weather[0].description,
						tempMin: apiData.main.temp_min,
						tempMax: apiData.main.temp_max,
					});

					// Finally save in database
					newCity.save().then(newCity => {
						res.json({ result: true, weather: newCity });
					});
				});
		} else {
			// City already exists in database
			res.json({ result: false, error: 'City already saved' });
		}
	});
});

// ROUTER GET DISPLAY ALL CITIES 
router.get('/', (req, res) => {
	City.find().then(data => {
		res.json({ weather: data });
	});
});

// ROUTER GET FIND A CITY
router.get("/:cityName", (req, res) => {
  City.findOne({
    cityName: { $regex: new RegExp('^' + req.params.cityName + '$', "i") },
  }).then(data => {
    if (data) {
      res.json({ result: true, weather: data });
    } else {
      res.json({ result: false, error: "City not found" });
    }
  });
});

// ROUTER DELETE REMOVE A CITY
router.delete("/:cityName", (req, res) => {
  City.deleteOne({
    cityName: { $regex: new RegExp('^' + req.params.cityName + '$', "i") },
  }).then(deletedDoc => {
    if (deletedDoc.deletedCount > 0) {
      // document successfully deleted
      City.find().then(data => {
        res.json({ result: true, weather: data });
      });
    } else {
      res.json({ result: false, error: "City not found" });
    }
  });
});

module.exports = router;
