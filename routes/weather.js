var express = require('express');
var router = express.Router();

const fetch = require('node-fetch');

const Usercity = require('../models/usercities');
const { authenticateToken } = require('../middlewares/authenticateToken');

function myNewCityFormatedData(data) {
	return {
		cityName: data.cityName,
	}
};

let weather = [
	"Mexico",
    "Tokyo",
    "Moscow",
    "Jakarta",
    "Seoul",
    "London",
    "New York",
];

// Router post display home page cities
router.get('/home_page', (req, res) => {
	res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5500');
	const fetchPromises = weather.map(async cityName => {
		return fetch(`https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${process.env.OWM_API_KEY}&units=metric`)
		.then(res => res.json())
	});
	Promise.all(fetchPromises)
	.then(apiData => {
		res.json({ result: true, homepagedata: apiData, cityName: weather });
	});
});

// Router post to save a new city in the account user 
router.post('/add_new_city', authenticateToken, async (req, res) => {
	try {
		const data = await Usercity.findOne({ cityName: new RegExp(req.body.cityName, 'i') });
		if (!data) {
			const newCityadded = new Usercity({
				user: req.user._id,
				cityName: req.body.cityName.slice(0,1).toUpperCase()+req.body.cityName.slice(1),
			});
			const newCity = await newCityadded.save();
			return res.status(201).json({ result: true, newCity: myNewCityFormatedData(newCity) });
		} else {
			if (!data.user.includes(req.user._id)) {
				await Usercity.updateOne({ cityName: new RegExp(req.body.cityName, 'i') }, { $push: { user: req.user._id } });
				return res.status(200).json({ result: true, update: 'Success' });
			} else {
				return res.status(409).json({ result: false, error: 'City already added' });
			}
		}
	} catch(error) {
		return res.status(500).json({ status: 'Internal server error', error: error });
	}
});

// Router post to add a city  without save in the home page
router.post('/add_city_home_page', async (req, res) => {
	const cityName = req.body.cityName.toLowerCase();
	const formatedWeather = weather.map(e => e.toLowerCase());
	const formatedCityName = req.body.cityName.slice(0,1).toUpperCase()+req.body.cityName.slice(1);

	try  {
		if (!formatedWeather.includes(cityName)) {
			const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${formatedCityName}&appid=${process.env.OWM_API_KEY}&units=metric`);
			const apiData = await response.json();
			if (!(apiData.cod === '404' && apiData.message === 'city not found')) {
				return res.status(200).json({ result: true, city: apiData, cityName: formatedCityName });
			} else {
				return res.status(404).json({ result: false, error: 'City not found' });
			}
		} else {
			return res.status(409).json({ result: false, error: 'City already added' });
		}
	} catch (error) {
		return res.status(500).json({ status: 'Internal server error', error: error });
	}
})

// Router get display all user cities 
router.get('/my_cities_added', authenticateToken, async (req, res) => {
	try  {
		const data = await Usercity.find({ user: req.user._id });
		const myCitiesName = data.map(e => e.cityName);
		const fetchPromises = myCitiesName.map(async cityName => {
			const res =  await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${process.env.OWM_API_KEY}&units=metric`);
			return res.json();
		});
		const userCities = await Promise.all(fetchPromises);
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
			await Usercity.deleteOne({ cityName: cityNotFound });
			return res.status(404).json({ cityNotFound: true, myCities: foundCities, myCitiesName: myCitiesName });
		} else {
			return res.status(200).json({ result: true, myCities: userCities, myCitiesName: myCitiesName })
		}
	} catch (error) {
		return res.status(500).json({ status: 'Internal server', error: error });
	}
});

// Router get the locale time of a city 
router.get('/local_time/:lat/:lon', /*authenticateToken,*/ async (req, res) => {
	const lat = req.params.lat;
	const lon = req.params.lon;
	try {
		const response = await fetch(`http://api.timezonedb.com/v2.1/get-time-zone?key=${process.env.LOCAL_TIME}&format=json&by=position&lat=${lat}&lng=${lon}`);
		const apiTimeData = await response.json();
		if (apiTimeData) {
			return res.status(200).json({ result: true, localTime: apiTimeData });
		} else {
			return res.status(500).json({ result: false, error: "Error fetching local time" });
		}
	} catch (error) {
		return res.status(500).json({ status: 'Internal server error', error: error });
	}
})

// Router delete city 
router.delete('/:cityName', authenticateToken, async (req, res) => {
	try {
		const data = await Usercity.findOne ({ cityName: { $regex: new RegExp(req.params.cityName, "i") } });
		if (data) {
			if (data.user.includes(req.user._id)) {
				if (data.user.length === 1) {
					const deletedData = await Usercity.deleteOne({ cityName: new RegExp(req.params.cityName, "i") });
					if (deletedData.deletedCount > 0) {
						return res.status(200).json({ result: true, deletedData: 'Succes'});
					}
				} else {
					await Usercity.updateOne({ user: req.user._id }, { $pull: { user: req.user._id } })
					return res.status(200).json({ result: true, updatedData: 'Success'});
				}
			} else {
				return res.status(403).json({ result: false, error: 'Unauthorized to delete this city' });
			}
		} else {
			return res.status(404).json({ result: false, error: 'City not found' });
		}
	} catch (error) {
		return res.status(500).json({ status: 'Internal server error', error: error });
	}
});

module.exports = router;
