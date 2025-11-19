import React, { useState, useEffect } from 'react';

const InfoWidget = ({ isDarkMode, colors }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState({ lat: 38.89511, lon: -77.03637 }); // Default to Washington DC
  const [locationDenied, setLocationDenied] = useState(false);

  useEffect(() => {
    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Get user's location
    const getLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            // Success - use user's location
            const userLocation = {
              lat: position.coords.latitude,
              lon: position.coords.longitude
            };
            setLocation(userLocation);
            fetchWeather(userLocation.lat, userLocation.lon);
          },
          (error) => {
            // Error or denied - use default location (Washington DC)
            console.log('Location access denied or unavailable, using default location');
            setLocationDenied(true);
            fetchWeather(38.89511, -77.03637); // Washington DC coordinates
          }
        );
      } else {
        // Geolocation not supported - use default location
        console.log('Geolocation not supported, using default location');
        setLocationDenied(true);
        fetchWeather(38.89511, -77.03637); // Washington DC coordinates
      }
    };

    // Fetch real weather data from a free weather API
    const fetchWeather = async (lat, lon) => {
      try {
        // Using wttr.in through our proxy to avoid CORS issues
        const response = await fetch(
          `/api/weather/${lat},${lon}?format=j1`
        );
        
        if (response.ok) {
          const data = await response.json();
          console.log('wttr.in response:', data);
          
          // Extract current weather data
          const current = data.current_condition[0];
          
          // Get location name
          let locationName = 'Washington DC'; // Default
          if (lat !== 38.89511 || lon !== -77.03637) {
            // Try to get location name from the weather data
            if (data.nearest_area && data.nearest_area[0]) {
              const area = data.nearest_area[0];
              if (area.areaName && area.areaName[0] && area.areaName[0].value) {
                locationName = area.areaName[0].value;
                if (area.region && area.region[0] && area.region[0].value) {
                  locationName += `, ${area.region[0].value}`;
                }
              }
            } else {
              // Fallback to coordinate-based name
              locationName = `Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`;
            }
          }
          
          setWeather({
            temperature: parseInt(current.temp_C),
            condition: getConditionFromCode(current.weatherCode),
            location: locationName,
            humidity: parseInt(current.humidity),
            wind: Math.round(parseFloat(current.windspeedKmph))
          });
        } else {
          // Fallback to simulated data if API fails
          console.log('Weather API failed, using simulated data');
          fetchSimulatedWeather(lat, lon);
        }
      } catch (error) {
        console.log('Error fetching real weather data, using simulated data:', error);
        // Fallback to simulated data if API fails
        fetchSimulatedWeather(lat, lon);
      }
      
      setLoading(false);
    };

    // Simulate weather data as fallback
    const fetchSimulatedWeather = async (lat, lon) => {
      // Improved temperature calculation based on latitude and season
      let temperature, condition;
      
      // Get current month (0-11)
      const month = new Date().getMonth();
      // Northern hemisphere seasons: 0=Winter, 1=Spring, 2=Summer, 3=Fall
      // Southern hemisphere seasons: 2=Winter, 3=Spring, 0=Summer, 1=Fall
      const isNorthernHemisphere = lat >= 0;
      let season;
      
      if (month >= 2 && month <= 4) season = isNorthernHemisphere ? 1 : 3; // Spring/Fall
      else if (month >= 5 && month <= 7) season = isNorthernHemisphere ? 2 : 0; // Summer/Winter
      else if (month >= 8 && month <= 10) season = isNorthernHemisphere ? 3 : 1; // Fall/Spring
      else season = isNorthernHemisphere ? 0 : 2; // Winter/Summer
      
      // Base temperature calculation based on latitude
      const distanceFromEquator = Math.abs(lat);
      let baseTemp;
      
      // More realistic temperature ranges
      if (distanceFromEquator < 23.5) {
        // Tropical zone
        baseTemp = season === 2 ? 30 : season === 0 ? 25 : 28; // Summer, Winter, Spring/Fall
      } else if (distanceFromEquator < 40) {
        // Subtropical zone
        baseTemp = season === 2 ? 28 : season === 0 ? 8 : 18; // Summer, Winter, Spring/Fall
      } else if (distanceFromEquator < 60) {
        // Temperate zone
        baseTemp = season === 2 ? 25 : season === 0 ? 0 : 12; // Summer, Winter, Spring/Fall
      } else {
        // Polar zone
        baseTemp = season === 2 ? 10 : season === 0 ? -15 : -5; // Summer, Winter, Spring/Fall
      }
      
      // Add some randomness for variation
      temperature = baseTemp + Math.floor(Math.random() * 7) - 3;
      
      // Condition based on temperature and random factors
      const rand = Math.random();
      if (temperature > 25) {
        condition = rand > 0.7 ? 'Sunny' : rand > 0.4 ? 'Partly Cloudy' : 'Cloudy';
      } else if (temperature > 15) {
        condition = rand > 0.6 ? 'Partly Cloudy' : rand > 0.3 ? 'Cloudy' : 'Rainy';
      } else if (temperature > 5) {
        condition = rand > 0.5 ? 'Cloudy' : rand > 0.2 ? 'Rainy' : 'Partly Cloudy';
      } else {
        condition = rand > 0.6 ? 'Cloudy' : rand > 0.3 ? 'Rainy' : 'Sunny';
      }
      
      // Get location name
      let locationName = 'Washington DC'; // Default
      if (lat !== 38.89511 || lon !== -77.03637) {
        // Try to get actual location name
        try {
          locationName = await getLocationName(lat, lon);
        } catch (error) {
          console.log('Error getting location name, using fallback');
          locationName = `Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`;
        }
      }
      
      setWeather({
        temperature: temperature,
        condition: condition,
        location: locationName,
        humidity: Math.floor(Math.random() * 50) + 30, // Random humidity between 30-80%
        wind: Math.floor(Math.random() * 20) + 5 // Random wind speed between 5-25 km/h
      });
    };

    getLocation();

    return () => {
      clearInterval(timer);
    };
  }, []);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Get weather icon based on condition
  const getWeatherIcon = (condition) => {
    switch (condition) {
      case 'Sunny':
        return '☀️';
      case 'Cloudy':
        return '☁️';
      case 'Rainy':
        return '🌧️';
      case 'Partly Cloudy':
        return '⛅';
      default:
        return '🌤️';
    }
  };

  // Convert weather code to our conditions
  const getConditionFromCode = (code) => {
    // Common weather codes from wttr.in
    const codeMap = {
      '113': 'Sunny',
      '116': 'Partly Cloudy',
      '119': 'Cloudy',
      '122': 'Cloudy',
      '143': 'Cloudy',
      '176': 'Partly Cloudy',
      '179': 'Rainy',
      '182': 'Rainy',
      '185': 'Rainy',
      '200': 'Rainy',
      '227': 'Cloudy',
      '230': 'Rainy',
      '248': 'Cloudy',
      '260': 'Cloudy',
      '263': 'Rainy',
      '266': 'Rainy',
      '281': 'Rainy',
      '284': 'Rainy',
      '293': 'Rainy',
      '296': 'Rainy',
      '299': 'Rainy',
      '302': 'Rainy',
      '305': 'Rainy',
      '308': 'Rainy',
      '311': 'Rainy',
      '314': 'Rainy',
      '317': 'Rainy',
      '320': 'Rainy',
      '323': 'Rainy',
      '326': 'Rainy',
      '329': 'Rainy',
      '332': 'Rainy',
      '335': 'Rainy',
      '338': 'Rainy',
      '350': 'Rainy',
      '353': 'Rainy',
      '356': 'Rainy',
      '359': 'Rainy',
      '362': 'Rainy',
      '365': 'Rainy',
      '368': 'Rainy',
      '371': 'Rainy',
      '374': 'Rainy',
      '377': 'Rainy',
      '386': 'Rainy',
      '389': 'Rainy',
      '392': 'Rainy',
      '395': 'Rainy'
    };
    
    return codeMap[code] || 'Partly Cloudy';
  };

  // Add a function to reverse geocode coordinates to location name
  const getLocationName = async (lat, lon) => {
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('BigDataCloud response:', data);
        
        if (data.city && data.principalSubdivision) {
          return `${data.city}, ${data.principalSubdivision}`;
        } else if (data.city) {
          return data.city;
        } else if (data.locality) {
          return data.locality;
        } else if (data.principalSubdivision) {
          return data.principalSubdivision;
        }
      }
    } catch (error) {
      console.log('BigDataCloud error:', error);
    }
    
    // Fallback to coordinate-based name
    return `Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`;
  };

  return (
    <div 
      className="rounded-xl p-4 theme-surface border theme-border shadow-lg"
      style={{ 
        backgroundColor: colors.surface,
        borderColor: colors.border
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold theme-text">Today's Info</h3>
        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
      </div>

      {/* Date and Time */}
      <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30">
        <p className="text-sm theme-text-secondary">{formatDate(currentTime)}</p>
        <p className="text-2xl font-bold theme-text">{formatTime(currentTime)}</p>
      </div>

      {/* Weather */}
      {loading ? (
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
        </div>
      ) : (
        <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/30 dark:to-blue-900/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold theme-text">{weather?.temperature}°C</p>
              <p className="text-sm theme-text-secondary">{weather?.condition}</p>
            </div>
            <div className="text-4xl">
              {getWeatherIcon(weather?.condition)}
            </div>
          </div>
          <div className="mt-2 text-xs theme-text-secondary">
            <p>📍 {weather?.location}</p>
            <div className="flex justify-between mt-1">
              <span>💧 {weather?.humidity}% humidity</span>
              <span>💨 {weather?.wind} km/h wind</span>
            </div>
          </div>
          {locationDenied && (
            <div className="mt-3 p-2 bg-blue-100 dark:bg-blue-900/50 rounded text-xs theme-text">
              <p>Enable location for personalized weather ✨</p>
              <button 
                className="mt-1 text-blue-600 dark:text-blue-300 font-medium"
                onClick={() => {
                  setLocationDenied(false);
                  getLocation();
                }}
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InfoWidget;