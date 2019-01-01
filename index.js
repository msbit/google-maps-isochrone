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

function splitSteps(steps, duration) {
  let result = [];
  let currentDuration = 0;
  let currentPoints = [];
  for (let step of steps) {
    const stepPoints = google.maps.geometry.encoding.decodePath(step.polyline.points);
    const stepSpeed = step.distance.value / step.duration.value;

    let prevPoint = stepPoints[0];
    currentPoints.push({
      point: stepPoints[0],
      speed: stepSpeed
    });
    for (let i = 1; i < stepPoints.length; i++) {
      const pointDistance = google.maps.geometry.spherical.computeDistanceBetween(prevPoint, stepPoints[i]);
      currentDuration += pointDistance / stepSpeed;
      currentPoints.push({
        point: stepPoints[i],
        speed: stepSpeed
      });
      if (currentDuration > result.length * duration) {
        result.push(createStep(currentPoints));
        currentPoints.length = 0;
      }

      prevPoint = stepPoints[i];
    }
  }
  if (currentPoints.length) {
    result.push(createStep(currentPoints));
  }
  return result;
}

function getDetails(data) {
    let distance = 0;
    let duration = 0;
    let previous = data[0];

    for (let i = 0; i < data.length; i++) {
      const current = data[i];
      const currentDistance = google.maps.geometry.spherical.computeDistanceBetween(previous.point, current.point);
      distance += currentDistance;
      duration += currentDistance / current.speed;
      previous = data[i];
    }
    return [distance, duration];
}

function createStep(data) {
  const [distance, duration] = getDetails(data);
  return {
    distance: {
      text: distance.toString(),
      value: distance
    },
    duration: {
      text: duration.toString(),
      value: duration
    },
    path: data.map(function (d) { return d.point; }),
    travel_mode: google.maps.DirectionsTravelMode.DRIVING
  };
}

function initMap() {
  const service = new google.maps.DirectionsService();
  const map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: -34.397, lng: 150.644},
    zoom: 8
  });

  const start = '201 spring st, melbourne';
  const end = '14 easey st, collingwood';
  const request = {
    origin: start,
    destination: end,
    travelMode: google.maps.DirectionsTravelMode.DRIVING
  };

  service.route(request, function (result, status) {
    if (status == google.maps.DirectionsStatus.OK) {
      if (result.routes.length && result.routes[0].legs.length && result.routes[0].legs[0].steps.length) {
        map.fitBounds(result.routes[0].bounds);
        const duration = result.routes[0].legs[0].duration.value;
        const stepCount = 2;

        splitSteps(result.routes[0].legs[0].steps, duration / stepCount).forEach(function (step, i) {
          const renderer = new google.maps.DirectionsRenderer({
            map: map,
            polylineOptions: {
              strokeColor: `hsl(${120 - (i * (120 / stepCount))}, 50%, 50%)`
            },
            preserveViewport: true,
            suppressMarkers: true
          });
          renderer.setDirections(makeResult(step));
        });
      }
    }
  });
}
