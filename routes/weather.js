var express = require('express');
var router = express.Router();

const fetch = require('node-fetch');
const Usercity = require('../models/usercities');

const { authenticateToken } = require('../middlewares/authenticateToken');

function myNewCityFormatedData(data) {
	return {
		cityName: data.cityName
	}
};

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
    "Mexico"
];

// Router post display home page cities
router.get('/home_page', (req, res) => {
	const fetchPromises = weather.map(async cityName => {
		return fetch(`https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${process.env.OWM_API_KEY}&units=metric`)
		.then(res => res.json())
	});
	Promise.all(fetchPromises)
	.then(apiData => {
		res.json({ result: true, homepagedata: apiData, cityName: weather });
	});
});

// Router post to save a new city in the count user 
router.post('/add_new_city', authenticateToken, (req, res) => {
	Usercity.findOne({ cityName: new RegExp(req.body.cityName, 'i') })
	.then(data => {
		if (data === null) {
			const newCityadded = new Usercity({
				user: req.user._id,
				cityName: req.body.cityName.slice(0,1).toUpperCase()+req.body.cityName.slice(1),
			})
			newCityadded.save().then(newCity => {
				res.json({ result: true, newCity: myNewCityFormatedData(newCity) });
			})
		} else {
			if (!data.user.includes(req.user._id)) {
				Usercity.updateOne({ cityName: new RegExp(req.body.cityName, 'i') }, { $push: { user: req.user._id } })
				.then(() => {
					res.json({ result: true, update: 'Success' });
				})
			} else {
				res.json({ result: false, error: 'City already added' });
			}
		}
	})
});

// Router post to add a city  without save in the home page
router.post('/add_city_home_page', (req, res) => {
	const cityName = req.body.cityName.toLowerCase();
	const formatedWeather = weather.map(e => e.toLowerCase());
	const formatedCityName = req.body.cityName.slice(0,1).toUpperCase()+req.body.cityName.slice(1);
	if (!formatedWeather.includes(cityName)) {
		fetch(`https://api.openweathermap.org/data/2.5/weather?q=${formatedCityName}&appid=${process.env.OWM_API_KEY}&units=metric`)
		.then(res => res.json())
		.then(apiData => {
			if (!(apiData.cod === '404' && apiData.message === 'city not found')) {
				res.json({ result: true, city: apiData, cityName: formatedCityName });
			} else {
				res.json({ result: false, error: 'City not found' });
			}
	})
	} else {
		res.json({ result: false, error: 'City already added' });
		}
})

// Router get display all user cities 
router.get('/my_cities_added', authenticateToken, (req, res) => {
	Usercity.find({ user: req.user._id })
	.then(data => {
		const myCitiesName = data.map(e => e.cityName);
		const fetchPromises = myCitiesName.map(cityName => {
			return fetch(`https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${process.env.OWM_API_KEY}&units=metric`)
			.then(res => res.json())
		});
		Promise.all(fetchPromises)
		.then(userCities => {
			let cityNotFound = null;
			const foundCities = [];
			for (i = 0; i < userCities.length; i++) {
				if (userCities[i].cod === '404') {
					cityNotFound = myCitiesName[i];
				} else {
					foundCities.push(userCities[i])
				}
			}
			if (cityNotFound) {
				Usercity.deleteOne({ cityName: cityNotFound })
					.then(() => {
						res.json({ cityNotFound: true, myCities: foundCities, myCitiesName: myCitiesName });
					})
			} else {
				res.json({ result: true, myCities: userCities, myCitiesName: myCitiesName })
			}
		})
	})
});

// Router delete city 
router.delete('/:cityName', authenticateToken, (req, res) => {
	Usercity.findOne ({ cityName: { $regex: new RegExp(req.params.cityName, "i") } })
	.then(data => {
		if (data) {
			if (data.user.includes(req.user._id)) {
				if (data.user.length === 1) {
					Usercity.deleteOne({ cityName: new RegExp(req.params.cityName, "i") })
					.then(deletedData => {
						if (deletedData.deletedCount > 0) {
							res.json({ result: true, deletedData: 'Succes'});
						}
					})
				} else {
					Usercity.updateOne({ user: req.user._id }, { $pull: { user: req.user._id } })
					.then(() => {
						res.json({ result: true, updatedData: 'Success'});
					})
				}
			}
		} else {
			res.json({ result: false, error: 'City not found' });
		}
	})
});

module.exports = router;
