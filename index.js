window.addEventListener('load', () => {
  const head = document.getElementsByTagName('head')[0];
  const script = document.createElement('script');
  script.async = true;
  script.defer = true;
  script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap`;
  script.type = 'text/javascript';
  head.appendChild(script);
});

function makeResult(step) {
  const result = {
    request: {
      travelMode: google.maps.DirectionsTravelMode.DRIVING
    },
    routes: [{
      legs: [{
        steps: [step]
      }]
    }]
  };
  return result; 
}

function normalise(inputMin, inputMax, outputMin, outputMax, input) {
  const inputRange = inputMax - inputMin;
  const outputRange = outputMax - outputMin;
  return (((input - inputMin) / inputRange) * outputRange) + outputMin;
}

function initMap() {
  const service = new google.maps.DirectionsService();
  const map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: -34.397, lng: 150.644},
    zoom: 8
  });

  const start = 'new york';
  const end = 'san francisco';
  const request = {
    origin: start,
    destination: end,
    travelMode: google.maps.DirectionsTravelMode.DRIVING
  };

  service.route(request, function (result, status) {
    if (status == google.maps.DirectionsStatus.OK) {
      if (result.routes.length && result.routes[0].legs.length && result.routes[0].legs[0].steps.length) {
        map.fitBounds(result.routes[0].bounds);
        const steps = result.routes[0].legs[0].steps;
        const [minSpeed, maxSpeed] = steps.reduce(function (accumulator, step) {
          const [min, max] = accumulator;
          const speed = step.distance.value / step.duration.value;
          return [speed < min ? speed : min, speed > max ? speed : max];
        }, [0, 0]);
        for (let step of steps) {
          google.maps.geometry.encoding.encodePath(google.maps.geometry.encoding.decodePath(step.polyline.points));
          const speed = step.distance.value / step.duration.value;
          const speedNormalised = normalise(minSpeed, maxSpeed, 0, 120, speed);
          const renderer = new google.maps.DirectionsRenderer({
            map: map,
            polylineOptions: {
              strokeColor: `hsl(${speedNormalised}, 50%, 50%)`
            },
            preserveViewport: true,
            suppressMarkers: true
          });
          renderer.setDirections(makeResult(step));
        };
      }
    }
  });
}
