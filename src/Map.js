import React, { useRef, useEffect, useState } from 'react';
import mapboxgl, { LngLat } from 'mapbox-gl';
import MapBoxGeocoder from '@mapbox/mapbox-gl-geocoder'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faMapMarkerAlt, faSitemap, faMapLocation } from '@fortawesome/free-solid-svg-icons';
import DataTable from 'react-data-table-component';
import axios from 'axios'
import './Map.css';
import columns from './components/forecastTableColumn';
import cityList from './components/defaultCityList';
import WeatherComponent from './components/weatherCard';
import Cookies from "js-cookie"

mapboxgl.accessToken =
  'pk.eyJ1Ijoib2FrdHJlZWFuYWx5dGljcyIsImEiOiJjbGhvdWFzOHQxemYwM2ZzNmQxOW1xZXdtIn0.JPcZgPfkVUutq8t8Z_BaHg';

const Map = () => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const isInitialMount = useRef(true);

  const geocoder = new MapBoxGeocoder({
    // Initialize the geocoder
    accessToken: 'pk.eyJ1Ijoib2FrdHJlZWFuYWx5dGljcyIsImEiOiJjbGhvdWFzOHQxemYwM2ZzNmQxOW1xZXdtIn0.JPcZgPfkVUutq8t8Z_BaHg', // Set the access token
    // localGeocoderOnly: true,
    mapboxgl: mapboxgl, // Set the mapbox-gl instance
    marker: true, // Do not use the default marker style
    zoom: 12,
    marker: false,
    placeholder: 'Search locations',

  });


  const [locations, setLocations] = useState([]);
  const [weatherData, setWeatherData] = useState([]);

  //---------------------- Weather data display--------------------//

  const [currentLocation, setCurrentLocation] = useState();
  const [temperature, setTemperature] = useState();
  const [temperatureUnit, setTemperatureUnit] = useState('F');
  const temperatureUnitRef = useRef(temperatureUnit);
  const [humidity, setHumidity] = useState();
  const [windddir, setWinddir] = useState();
  const [windGust, setWindGust] = useState();
  const [snow, setSnow] = useState();
  const [solorEnergy, setSolorEnergy] = useState();
  const [windSpeed, setWindSpeed] = useState();
  const [conditions, setConditions] = useState();
  const [pressure, setPressure] = useState();
  const [moonphase, setMoonphase] = useState();
  const [forecast, setForecast] = useState([])

  //---------------------- Control UI----------------------//
  const [foreEnable, setForeEnable] = useState(false)
  const [defaultCityShowEnable, setDefaultCityShowEnable] = useState(true)

  // Initialize map when component mounts
  useEffect(() => {

    if (isInitialMount.current) {
      // This code will run only on the initial mount
      isInitialMount.current = false;
    } else {

      loadLocations()

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/satellite-streets-v12',
        center: [-97.9222112121185, 39.3812661305678],
        zoom: 4,

      });

      map.doubleClickZoom.disable();


      // Add navigation control (the +/- zoom buttons)
      map.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.addControl(geocoder)

      mapRef.current = map;


      showDefaultCity()

      map.on('dblclick', async (event) => {


        const temp_location = await map_API_Geo2Location(event.lngLat.lng, event.lngLat.lat)
        const data = JSON.parse(await weather_API(temp_location))
        const weather_data = data.currentConditions
        const forecast_data = data.days

        console.log(forecast_data)

        setWeatherData((prevWeathers) => [...prevWeathers, weather_data]);

        const markerElement = document.createElement('div');
        markerElement.className = 'custom-marker';
        markerElement.style.maxWidth = "136px"
        markerElement.addEventListener('click', () => {
          const TEMP =
            temperatureUnitRef.current === 'C'
              ? `${Math.floor((weather_data.temp - 32) * 5 / 9)}°C`
              : `${Math.floor(weather_data.temp)}°F`;
          setCurrentLocation(temp_location)
          setTemperature(TEMP)
          setHumidity(weather_data.humidity)
          setWinddir(weather_data.winddir)
          setWindGust(weather_data.windgust)
          setSnow(weather_data.snow)
          setSolorEnergy(weather_data.solorenergy)
          setWindSpeed(weather_data.windspeed)
          setConditions(weather_data.conditions)
          setPressure(weather_data.pressure)
          setMoonphase(weather_data.moonphase)
          setForecast(forecast_data)
        });

        const container = document.createElement('div');
        container.style.display = "flex"
        // Create and style the image element
        const imageElement = document.createElement('div');
        imageElement.style.backgroundImage = `url(../icons/${weather_data.icon}.svg)`;
        imageElement.style.width = '54px';
        imageElement.style.height = '54px';
        imageElement.style.backgroundSize = '100% 100%';
        imageElement.className = 'marker-image';

        // Create and style the temperature text element
        const temperatureElement = document.createElement('div');
        temperatureElement.className = 'marker-temperature'
        temperatureElement.textContent =
          temperatureUnitRef.current === 'C'
            ? `${Math.floor((weather_data.temp - 32) * 5 / 9)}°C`
            : `${Math.floor(weather_data.temp)}°F`;
        temperatureElement.style.alignSelf = "center"
        temperatureElement.style.fontSize = "36px"
        temperatureElement.style.color = "white"
        temperatureElement.style.fontWeight = "bold"

        container.appendChild(imageElement)
        container.appendChild(temperatureElement)

        // Create and style the location name element
        const locationElement = document.createElement('div');
        locationElement.textContent = temp_location; // Replace with the actual location name
        locationElement.className = 'marker-location';
        locationElement.style.textAlign = "center"
        locationElement.style.fontSize = "12px"
        locationElement.style.color = "white"
        locationElement.style.fontWeight = "bold"
        locationElement.style.maxWidth = "136px"

        // Append the elements to the marker element
        markerElement.appendChild(container)
        markerElement.appendChild(locationElement);

        // Append the marker element to the map
        const marker = new mapboxgl.Marker(markerElement).setLngLat(event.lngLat).addTo(map);

        setLocations((prevLocations) => [...prevLocations, temp_location]);

      })


      // Clean up on unmount
      return () => map.remove();
    }

  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  geocoder.on('result', async (event) => {
    const map = mapRef.current;
    const temp_location = event.result.place_name

    const data = JSON.parse(await weather_API(temp_location))
    const weather_data = data.currentConditions
    const forecast_data = data.days

    setWeatherData((prevWeathers) => [...prevWeathers, weather_data]);

    const markerElement = document.createElement('div');
    markerElement.className = 'custom-marker';
    markerElement.style.maxWidth = "136px"
    markerElement.addEventListener('click', () => {
      const TEMP =
        temperatureUnitRef.current === 'C'
          ? `${Math.floor((weather_data.temp - 32) * 5 / 9)}°C`
          : `${Math.floor(weather_data.temp)}°F`;
      setCurrentLocation(temp_location)
      setTemperature(TEMP)
      setHumidity(weather_data.humidity)
      setWinddir(weather_data.winddir)
      setWindGust(weather_data.windgust)
      setSnow(weather_data.snow)
      setSolorEnergy(weather_data.solorenergy)
      setWindSpeed(weather_data.windspeed)
      setConditions(weather_data.conditions)
      setPressure(weather_data.pressure)
      setMoonphase(weather_data.moonphase)
      setForecast(forecast_data)
    });
    const container = document.createElement('div');
    container.style.display = "flex"
    // Create and style the image element
    const imageElement = document.createElement('div');
    imageElement.style.backgroundImage = `url(../icons/${weather_data.icon}.svg)`;
    imageElement.style.width = '54px';
    imageElement.style.height = '54px';
    imageElement.style.backgroundSize = '100% 100%';
    imageElement.className = 'marker-image';

    // Create and style the temperature text element
    const temperatureElement = document.createElement('div');
    temperatureElement.className = 'marker-temperature'
    temperatureElement.textContent =
      temperatureUnitRef.current === 'C'
        ? `${Math.floor((weather_data.temp - 32) * 5 / 9)}°C`
        : `${Math.floor(weather_data.temp)}°F`; // Replace with the actual temperature
    temperatureElement.style.alignSelf = "center"
    temperatureElement.style.fontSize = "36px"
    temperatureElement.style.color = "white"
    temperatureElement.style.fontWeight = "bold"

    container.appendChild(imageElement)
    container.appendChild(temperatureElement)

    // Create and style the location name element
    const locationElement = document.createElement('div');
    locationElement.textContent = temp_location; // Replace with the actual location name
    locationElement.className = 'marker-location';
    locationElement.style.textAlign = "center"
    locationElement.style.fontSize = "12px"
    locationElement.style.color = "white"
    locationElement.style.fontWeight = "bold"
    locationElement.style.maxWidth = "136px"

    // Append the elements to the marker element
    markerElement.appendChild(container)
    markerElement.appendChild(locationElement);

    // Append the marker element to the map
    const marker = new mapboxgl.Marker(markerElement).setLngLat(event.result.center).addTo(map);

    setLocations((prevLocations) => [...prevLocations, temp_location]);
  });

  //-------------- change temerature unit----------

  useEffect(() => {
    var elements = document.getElementsByClassName("marker-temperature");
    if (elements.length > 0) {
      var texts = [];
      for (var i = 0; i < elements.length; i++) {
        var text = elements[i].textContent.trim();
        var intValue = parseInt(text.match(/\d+/)[0]);
        if (temperatureUnit === "C") {
          var temp = `${Math.floor((intValue - 32) * 5 / 9)}°C`
          elements[i].textContent = temp.toString()
        } else {
          var temp = `${Math.floor((intValue * 9 / 5) + 33)}°F`
          elements[i].textContent = temp.toString()
        }
      }
    }

  }, [temperatureUnit])

  //-------------------- Visible Mode for Default City-----------------//

  useEffect(() => {
    var elements = document.getElementsByClassName("custom-marker-default");
    if (elements.length > 0) {
      var texts = [];
      for (var i = 0; i < elements.length; i++) {
        if (defaultCityShowEnable) {
          elements[i].style.display = "flex"
        } else {
          elements[i].style.display = "none"
        }
      }
    }

  }, [defaultCityShowEnable])

  window.addEventListener('beforeunload', () => {
    // Save the current location to a cookie
    if (locations.length != 0)
      Cookies.set('savedLocations', JSON.stringify(locations));
  });

  //------------------ Load Locations from Cookie ------------------\\
  async function loadLocations() {
    const cookieData = Cookies.get('savedLocations');

    if (cookieData != undefined) {
      console.log('savedLocations :', JSON.parse(cookieData))
      var savedLocations = JSON.parse(cookieData)
      for (let i = 0; i < savedLocations.length; i++) {
        const geo = JSON.parse(await map_API_Location2Geo(savedLocations[i]))
        const data = JSON.parse(await weather_API(savedLocations[i]))
        const weather_data = data.currentConditions
        const forecast_data = data.days

        setWeatherData((prevWeathers) => [...prevWeathers, weather_data]);

        const markerElement = document.createElement('div');
        markerElement.className = 'custom-marker';
        markerElement.style.maxWidth = "136px"
        markerElement.addEventListener('click', () => {
          const TEMP =
            temperatureUnitRef.current === 'C'
              ? `${Math.floor((weather_data.temp - 32) * 5 / 9)}°C`
              : `${Math.floor(weather_data.temp)}°F`;
          setCurrentLocation(savedLocations[i])
          setTemperature(TEMP)
          setHumidity(weather_data.humidity)
          setWinddir(weather_data.winddir)
          setWindGust(weather_data.windgust)
          setSnow(weather_data.snow)
          setSolorEnergy(weather_data.solorenergy)
          setWindSpeed(weather_data.windspeed)
          setConditions(weather_data.conditions)
          setPressure(weather_data.pressure)
          setMoonphase(weather_data.moonphase)
          setForecast(forecast_data)
        });
        const container = document.createElement('div');
        container.style.display = "flex"
        // Create and style the image element
        const imageElement = document.createElement('div');
        imageElement.style.backgroundImage = `url(../icons/${weather_data.icon}.svg)`;
        imageElement.style.width = '54px';
        imageElement.style.height = '54px';
        imageElement.style.backgroundSize = '100% 100%';
        imageElement.className = 'marker-image';

        // Create and style the temperature text element
        const temperatureElement = document.createElement('div');
        temperatureElement.className = 'marker-temperature'
        temperatureElement.textContent =
          temperatureUnitRef.current === 'C'
            ? `${Math.floor((weather_data.temp - 32) * 5 / 9)}°C`
            : `${Math.floor(weather_data.temp)}°F`; // Replace with the actual temperature
        temperatureElement.style.alignSelf = "center"
        temperatureElement.style.fontSize = "36px"
        temperatureElement.style.color = "white"
        temperatureElement.style.fontWeight = "bold"

        container.appendChild(imageElement)
        container.appendChild(temperatureElement)

        // Create and style the location name element
        const locationElement = document.createElement('div');
        locationElement.textContent = savedLocations[i]; // Replace with the actual location name
        locationElement.className = 'marker-location';
        locationElement.style.textAlign = "center"
        locationElement.style.fontSize = "12px"
        locationElement.style.color = "white"
        locationElement.style.fontWeight = "bold"
        locationElement.style.maxWidth = "136px"

        // Append the elements to the marker element
        markerElement.appendChild(container)
        markerElement.appendChild(locationElement);

        // Append the marker element to the map
        const marker = new mapboxgl.Marker(markerElement).setLngLat(new LngLat(geo[0], geo[1])).addTo(mapRef.current);

        setLocations((prevLocations) => [...prevLocations, savedLocations[i]]);
      }
    }



  }

  //---------------- Show Default City Weather -------------------//
  async function showDefaultCity() {

    for (let i = 0; i < cityList.length; i++) {
      const geo = JSON.parse(await map_API_Location2Geo(cityList[i]))
      const data = JSON.parse(await weather_API(cityList[i]))
      const weather_data = data.currentConditions
      const forecast_data = data.days

      setWeatherData((prevWeathers) => [...prevWeathers, weather_data]);

      const markerElement = document.createElement('div');
      markerElement.className = 'custom-marker-default';
      markerElement.style.maxWidth = "136px"
      markerElement.addEventListener('click', () => {
        const TEMP =
          temperatureUnitRef.current === 'C'
            ? `${Math.floor((weather_data.temp - 32) * 5 / 9)}°C`
            : `${Math.floor(weather_data.temp)}°F`;
        setCurrentLocation(cityList[i])
        setTemperature(TEMP)
        setHumidity(weather_data.humidity)
        setWinddir(weather_data.winddir)
        setWindGust(weather_data.windgust)
        setSnow(weather_data.snow)
        setSolorEnergy(weather_data.solorenergy)
        setWindSpeed(weather_data.windspeed)
        setConditions(weather_data.conditions)
        setPressure(weather_data.pressure)
        setMoonphase(weather_data.moonphase)
        setForecast(forecast_data)
      });
      const container = document.createElement('div');
      container.style.display = "flex"
      // Create and style the image element
      const imageElement = document.createElement('div');
      imageElement.style.backgroundImage = `url(../icons/${weather_data.icon}.svg)`;
      imageElement.style.width = '54px';
      imageElement.style.height = '54px';
      imageElement.style.backgroundSize = '100% 100%';
      imageElement.className = 'marker-image';

      // Create and style the temperature text element
      const temperatureElement = document.createElement('div');
      temperatureElement.className = 'marker-temperature'
      temperatureElement.textContent =
        temperatureUnitRef.current === 'C'
          ? `${Math.floor((weather_data.temp - 32) * 5 / 9)}°C`
          : `${Math.floor(weather_data.temp)}°F`; // Replace with the actual temperature
      temperatureElement.style.alignSelf = "center"
      temperatureElement.style.fontSize = "36px"
      temperatureElement.style.color = "white"
      temperatureElement.style.fontWeight = "bold"

      container.appendChild(imageElement)
      container.appendChild(temperatureElement)

      // Create and style the location name element
      const locationElement = document.createElement('div');
      locationElement.textContent = cityList[i]; // Replace with the actual location name
      locationElement.className = 'marker-location';
      locationElement.style.textAlign = "center"
      locationElement.style.fontSize = "12px"
      locationElement.style.color = "white"
      locationElement.style.fontWeight = "bold"
      locationElement.style.maxWidth = "136px"

      // Append the elements to the marker element
      markerElement.appendChild(container)
      markerElement.appendChild(locationElement);

      // Append the marker element to the map
      const marker = new mapboxgl.Marker(markerElement).setLngLat(new LngLat(geo[0], geo[1])).addTo(mapRef.current);

      // setLocations((prevLocations) => [...prevLocations, cityList[i]]);
    }


  }

  const deletelocation = (index) => {
    const updatedlocations = [...locations];
    updatedlocations.splice(index, 1);
    setLocations(updatedlocations);
  };

  //--------------API_Call-----------
  async function weather_API(location) {
    const currentTime = new Date().toISOString();
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      // url: `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${location}/${currentTime}?key=3C8TRCWYPKSPU83H6U8CJ5CUR&include=current`,
      url: `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${location}?key=3C8TRCWYPKSPU83H6U8CJ5CUR&contentType=json`,
      headers: {}
    };

    try {
      const response = await axios.request(config);
      // const str = JSON.stringify(response.data.currentConditions);
      const str = JSON.stringify(response.data);

      return str;
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  async function map_API_Geo2Location(lng, lat) {
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${lng}&latitude=${lat}&access_token=pk.eyJ1Ijoib2FrdHJlZWFuYWx5dGljcyIsImEiOiJjbGhvdWFzOHQxemYwM2ZzNmQxOW1xZXdtIn0.JPcZgPfkVUutq8t8Z_BaHg`,
      headers: {}
    };

    try {
      const response = await axios.request(config);
      if (response.data.features.length !== 0) {
        const str = response.data.features[0].properties.full_address.toString();
        // setLocations((prevLocations) => [...prevLocations, str]);
        return str;
      }
    } catch (error) {
      console.log(error);
      return null
    }
  }

  async function map_API_Location2Geo(location) {
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `https://api.mapbox.com/search/geocode/v6/forward?q=${location}&access_token=pk.eyJ1Ijoib2FrdHJlZWFuYWx5dGljcyIsImEiOiJjbGhvdWFzOHQxemYwM2ZzNmQxOW1xZXdtIn0.JPcZgPfkVUutq8t8Z_BaHg`,
      headers: {}
    };

    try {
      const response = await axios.request(config);
      if (response.data.features.length !== 0) {
        const str = JSON.stringify(response.data.features[0].geometry.coordinates);
        // setLocations((prevLocations) => [...prevLocations, str]);
        return str;
      }
    } catch (error) {
      console.log(error);
      return null
    }
  }



  return (
    <div>
      {/* <div className='sidebarStyle1'>
        <button onClick={() => { setEnable(!enable);}}>
          <FontAwesomeIcon icon={enable ? faMapMarkerAlt : faMapLocation} />
        </button>
      </div> */}
      <div className='sidebarStyle1'>
        <div style={{ fontSize: '16px', textAlign: 'center', width: '100%', color: 'chartreuse', fontSize: '18px' }}> {currentLocation}</div>
        <div className='data_text'>Temperature : {temperature}</div>
        <div className='data_text'>Humidity : {humidity}</div>
        <div className='data_text'>Wind Direction : {windddir}</div>
        <div className='data_text'>Wind Gust : {windGust}</div>
        <div className='data_text'>Wind Speed : {windSpeed}</div>
        <div className='data_text'>Snow : {snow}</div>
        <div className='data_text'>Solor Energy : {solorEnergy}</div>
        <div className='data_text'>Conditions : {conditions}</div>
        <div className='data_text'>Pressure : {pressure}</div>
        <div className='data_text'>Moon Phase : {moonphase}</div>

        <div style={{ width: '100%', textAlign: 'center',}}></div>
        <button style={{ textAlign: 'center', color: 'aqua', fontSize: '15px', position: 'absolute', marginTop: '535px', 
          border: '1px solid white', borderRadius: 20, padding: '0 20px', marginLeft : '-6px' }} onClick={() => {
          temperatureUnitRef.current = temperatureUnit === 'C' ? 'F' : 'C'
          setTemperatureUnit(temperatureUnit === 'C' ? 'F' : 'C')
        }}>
          {/* Click Here To Change <br />   Temperature Unit ({temperatureUnit}) */}
          Click To Change Units
        </button>
        <button style={{ textAlign: 'center', color: 'aqua', fontSize: '15px', position: 'absolute', marginTop: '560px', width: '100%', marginLeft : '-6px'  }} onClick={() => setForeEnable(!foreEnable)}>
          {/* Click Here To Change <br />   Temperature Unit ({temperatureUnit}) */}
          Click To {foreEnable ? "Hide" : "Show"} Forecast Weather
        </button>
        <button style={{ textAlign: 'center', color: 'aqua', fontSize: '15px', position: 'absolute', marginTop: '508px', width: '100%' , marginLeft : '-6px' }} onClick={() => setDefaultCityShowEnable(!defaultCityShowEnable)}>
          {/* Click Here To Change <br />   Temperature Unit ({temperatureUnit}) */}
          Click To {defaultCityShowEnable ? "Hide" : "Show"} Default City
        </button>
      </div>
      <div style={{
        position: 'absolute',
        zIndex: 1,
        height: '76%',
        top: '15%',
        width: '60%',
        left: '20%',
        display: foreEnable ? "flex" : "none",
        flexDirection: 'column',
        background: 'black',
        opacity: 0.8,
        borderRadius: '10px',
        paddingTop: '20px',
        paddingBottom: '20px',
      }}>

        <div style={{ fontSize: '20px', textAlign: 'center', width: '100%', color: 'chartreuse', fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}> {currentLocation}</div>

        <div style={{ justifyContent: 'space-around', display: 'flex', width: '100%' }}>
          <WeatherComponent
            date={forecast.length === 0 ? "" : forecast[0].datetime}
            weatherImage={forecast.length === 0 ? "" : `../icons/${forecast[0].icon}.svg`}
            weatherState={forecast.length === 0 ? "" : forecast[0].description}
            weatherData={[
              { label: 'Max Temperature', value: forecast.length === 0 ? "" : forecast[0].tempmax },
              { label: 'Min Temperature', value: forecast.length === 0 ? "" : forecast[0].tempmin },
              { label: 'Rain ', value: forecast.length === 0 ? "" : forecast[0].precip + "In" },
              { label: 'Precip ', value: forecast.length === 0 ? "" : forecast[0].precipprob + "%" },
              // Add more weather data details as needed
            ]}
          />
          <WeatherComponent
            date={forecast.length === 0 ? "" : forecast[1].datetime}
            weatherImage={forecast.length === 0 ? "" : `../icons/${forecast[1].icon}.svg`}
            weatherState={forecast.length === 0 ? "" : forecast[1].description}
            weatherData={[
              { label: 'Max Temperature', value: forecast.length === 0 ? "" : forecast[1].tempmax },
              { label: 'Min Temperature', value: forecast.length === 0 ? "" : forecast[1].tempmin },
              { label: 'Rain ', value: forecast.length === 0 ? "" : forecast[1].precip + "In" },
              { label: 'Precip ', value: forecast.length === 0 ? "" : forecast[1].precipprob + "%" },
              // Add more weather data details as needed
            ]}
          />
          <WeatherComponent
            date={forecast.length === 0 ? "" : forecast[2].datetime}
            weatherImage={forecast.length === 0 ? "" : `../icons/${forecast[2].icon}.svg`}
            weatherState={forecast.length === 0 ? "" : forecast[2].description}
            weatherData={[
              { label: 'Max Temperature', value: forecast.length === 0 ? "" : forecast[2].tempmax },
              { label: 'Min Temperature', value: forecast.length === 0 ? "" : forecast[2].tempmin },
              { label: 'Rain ', value: forecast.length === 0 ? "" : forecast[2].precip + "In" },
              { label: 'Precip ', value: forecast.length === 0 ? "" : forecast[2].precipprob + "%" },
              // Add more weather data details as needed
            ]}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'center', marginTop: '20px' }}>
          <a
            href={`https://www.visualcrossing.com/weather-forecast/${currentLocation}`}
            target="_blank"
            style={{ color: 'springgreen' }}
            className="link"
          >
            Show Forecast Weather Details For This Location
          </a>
          <a
            href={`https://www.visualcrossing.com/weather-history/${currentLocation}`}
            target="_blank"
            style={{ color: 'springgreen' }}
            className="link"
          >
            Show History Weather Details For This Location
          </a>
          <a
            href={`https://www.visualcrossing.com/average-weather/${currentLocation}`}
            target="_blank"
            style={{ color: 'springgreen' }}
            className="link"
          >
             Show Average Weather Details For This Location
          </a>
        </div>

      </div>

      <div className='sidebarStyle'>
        <ul>
          {locations.map((location, index) => (
            <li key={index}>
              {/* {location.split(",")[0] + location.split(",")[1]} */}
              {location}
              <button style={{ marginLeft: '10px' }} onClick={() => deletelocation(index)}>
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className='map-container' ref={mapContainerRef} />
    </div>
  );
};

export default Map;
