window.addEventListener('load', () => {
  const head = document.getElementsByTagName('head')[0];
  const script = document.createElement('script');
  script.async = true;
  script.defer = true;
  script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap`;
  script.type = 'text/javascript';
  head.appendChild(script);
});

function makeResult (step) {
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

function arcPointsByLength (centre, middleBearing, arcLength, radius) {
  const delta = (360 * arcLength) / (4 * Math.PI * radius);
  return arcPointsByBearing(centre, middleBearing - delta, middleBearing + delta, radius);
}

function arcPointsByBearing (centre, initialBearing, finalBearing, radius) {
  const points = [];

  if (initialBearing > finalBearing) {
    finalBearing += 360;
  }

  const delta = (finalBearing - initialBearing) / 32;

  for (let i = initialBearing; i <= finalBearing; i += delta) {
    points.push(google.maps.geometry.spherical.computeOffset(centre, radius, i));
  }
  return points;
}

function getInterval (duration) {
  if (duration > 300 && duration <= 900) {
    return 60;
  }
  if (duration > 900 && duration <= 2400) {
    return 300;
  }
  if (duration > 2400 && duration <= 4500) {
    return 600;
  }
  if (duration > 4500 && duration <= 7200) {
    return 900;
  }
  if (duration > 7200 && duration <= 86400) {
    return 3600;
  }
  if (duration > 86400 && duration <= 604800) {
    return 21600;
  }
  return 86400;
}

function withoutDuplicates (array, isDuplicate) {
  let result = [];
  result.push(array[0]);
  for (let i = 1; i < array.length; i++) {
    if (!isDuplicate(array[i - 1], array[i])) {
      result.push(array[i]);
    }
  }
  return result;
}

function splitSteps (steps, duration) {
  let result = [];
  let currentDuration = 0;
  let currentPoints = [];
  let data = [];

  for (let step of steps) {
    const speed = step.distance.value / step.duration.value;
    for (let point of google.maps.geometry.encoding.decodePath(step.polyline.points)) {
      data.push({
        point: point,
        speed: speed
      });
    }
  }

  data = withoutDuplicates(data, (a, b) => {
    return google.maps.geometry.spherical.computeDistanceBetween(a.point, b.point) === 0;
  });

  let i = 0;
  let j = 1;
  while (j < data.length) {
    const previous = data[j - 1];
    const current = data[j];
    const speed = data[j].speed;
    const distance = google.maps.geometry.spherical.computeDistanceBetween(previous.point, current.point);
    currentDuration += distance / speed;
    if (currentDuration > result.length * duration) {
      result.push(createStep(data.slice(i, j + 1)));
      i = j;
    }
    j++;
  }
  if (i < j) {
    result.push(createStep(data.slice(i, j + 1)));
  }

  return result;
}

function getDetails (data) {
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

function createStep (data) {
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
    path: data.map((d) => d.point),
    travel_mode: google.maps.DirectionsTravelMode.DRIVING
  };
}

function initMap () {
  const service = new google.maps.DirectionsService();
  const map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: -34.397, lng: 150.644},
    zoom: 8
  });

  const start = '431 skipton st, redan';
  const end = '11 kellett st, potts point';
  const request = {
    origin: start,
    destination: end,
    travelMode: google.maps.DirectionsTravelMode.DRIVING
  };

  service.route(request, (result, status) => {
    if (status === google.maps.DirectionsStatus.OK) {
      if (result.routes.length && result.routes[0].legs.length && result.routes[0].legs[0].steps.length) {
        map.fitBounds(result.routes[0].bounds);
        const duration = result.routes[0].legs[0].duration.value;

        const start = result.routes[0].legs[0].start_location;

        splitSteps(result.routes[0].legs[0].steps, 600).forEach((step, i, steps) => {
          const hue = 360 - (i * (360 / steps.length));
          const end = step.path[step.path.length - 1];
          const radius = google.maps.geometry.spherical.computeDistanceBetween(start, end);
          const heading = google.maps.geometry.spherical.computeHeading(start, end);
          const arc = new google.maps.Polyline({
            map: map,
            path: arcPointsByLength(start, heading, 10000, radius),
            strokeColor: `hsl(${hue}, 50%, 50%)`,
            strokeOpacity: 0.8,
            strokeWeight: 3
          });
          const renderer = new google.maps.DirectionsRenderer({
            map: map,
            polylineOptions: {
              strokeColor: `hsl(${hue}, 50%, 50%)`,
              strokeOpacity: 0.8,
              strokeWeight: 3
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
