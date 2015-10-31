(function() {
    var mapManager = window.mapManager = {};
    mapManager.var = {
        map: {},
        markerAry: [],
        infowindow: {},
        initParamCenter: {},
        userMarker: {},
        searchCircle: {}
    };

    var $jQObj = {
        slider: $("#slider"),
        queryString: $("#queryString")
    };

    mapManager.action = (function() {

        var geocoder = new google.maps.Geocoder();

        function geocodePosition(pos) {
            geocoder.geocode({
                latLng: pos
            }, function(responses) {
                if (responses && responses.length > 0) {
                    updateMarkerAddress(responses[0].formatted_address);
                } else {
                    updateMarkerAddress('Cannot determine address at this location.');
                }
            });
        }

        function updateMarkerAddress(str) {
            document.getElementById('address').innerHTML = str;
        }

        return {
            initialize: function() {

                mapManager.var.initParamCenter = new google.maps.LatLng(25.02674, 121.522926);
                var mapOptions = {
                    zoom: 7,
                    center: mapManager.var.initParamCenter
                };
                mapManager.var.map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
                mapManager.var.infowindow = new google.maps.InfoWindow();
                mapManager.var.userMarker = new google.maps.Marker({
                    map: mapManager.var.map,
                    draggable: true,
                    animation: google.maps.Animation.DROP,
                    icon: './images/spiderman.png'
                });

                google.maps.event.addListener(mapManager.var.userMarker, 'dragend', function() {
                    var _distance = parseInt($jQObj.slider.slider("option", "value") * 1000);
                    mapManager.var.searchCircle.setCenter(this.getPosition());
                    mapManager.var.searchCircle.setRadius(_distance);
                    geocodePosition(this.getPosition());
                    mapManager.overlay.clearMarkers();
                    fb.search.place($jQObj.queryString.val(), _distance);
                });

                mapManager.var.searchCircle = new google.maps.Circle({
                    strokeColor: '#3EA3E7',
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: '#3EA3E7',
                    fillOpacity: 0.35,
                    map: mapManager.var.map,
                    radius: 2000
                });

                if ($jQObj.slider.length > 0) {
                    $jQObj.slider.slider({
                        min: 1,
                        max: 5,
                        value: 2,
                        orientation: "horizontal",
                        range: "min",
                        slide: function(event, ui) {
                            var _distance = parseInt(ui.value);
                            $("#distance").text(_distance);
                            mapManager.var.searchCircle.setRadius(_distance * 1000);
                        },
                        stop: function(event, ui) {
                            fb.search.getResult();
                        }
                    }).addSliderSegments($jQObj.slider.slider("option").max);
                }
            },
            geolocation: function() { //定位.

                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(showPosition, errorCallback);
                } else {
                    alert("地址定位錯誤");
                }

                function errorCallback(error) {
                    var errorTypes = {
                        0: "不明原因錯誤,將使用預設位置",
                        1: "使用者拒絕提供位置資訊,將使用預設位置",
                        2: "無法取得位置資訊,將使用預設位置",
                        3: "位置查詢逾時,將使用預設位置"
                    };
                    var fakePosition = {
                        coords: { // 台北轉運站.
                            latitude: 25.04898,
                            longitude: 121.517077
                        }
                    };
                    showPosition(fakePosition);
                }

                function showPosition(position) {
                    var myLatlng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
                    mapManager.var.userMarker.setPosition(myLatlng);
                    mapManager.var.searchCircle.setCenter(myLatlng);
                    mapManager.var.map.panTo(myLatlng);
                    geocodePosition(mapManager.var.userMarker.getPosition());
                    fb.search.getResult();
                }
            }
        };
    })();

    mapManager.overlay = (function() {
        return {
            addMarker: function(position, name, pageId) {
                var _marker = new google.maps.Marker({
                    position: position,
                    map: mapManager.var.map,
                    icon: './images/food.png',
                    title: name
                });
                mapManager.var.markerAry.push(_marker);
                google.maps.event.addListener(_marker, 'click', function() {
                    if (mapManager.var.infowindow) {
                        mapManager.var.infowindow.close();
                    }
                    mapManager.var.infowindow.setContent(name);
                    mapManager.var.infowindow.open(mapManager.var.map, this);
                });
            },
            clearMarkers: function() {
                if (mapManager.var.markerAry) {
                    for (var i = 0; i < mapManager.var.markerAry.length; i++) {
                        mapManager.var.markerAry[i].setMap(null);
                    }
                    mapManager.var.markerAry.length = 0;
                }
                if (mapManager.var.markerCluster) {
                    mapManager.var.markerCluster.clearMarkers();
                }
            }
        };

    })();

    var fb = window.fb = {};
    fb.search = (function() {

        return {
            place: function(queryString, distance) {
                var center = mapManager.var.userMarker.getPosition().toString().replace('(', '').replace(')', '');
                $.ajax({
                    url: 'https://graph.facebook.com/v2.0/search',
                    data: {
                        'q': queryString,
                        'center': center,
                        'distance': distance,
                        'type': 'place',
                        'method': 'GET',
                        'format': 'json',
                        'suppress_http_code': 1,
                        'access_token': '710093095712867|73e4f69cc5932328cc866055b2745b59'
                    },
                    dataType: 'json',
                    method: 'POST',
                    success: function(responses) {
                        var category_arr = [];
                        if (responses.data !== null) {
                            var bounds = new google.maps.LatLngBounds();
                            for (var i = responses.data.length - 1; i >= 0; i--) {
                                var poi = responses.data[i];
                                var position = new google.maps.LatLng(poi.location.latitude, poi.location.longitude);
                                mapManager.overlay.addMarker(position, poi.name, poi.id);
                                bounds.extend(position);
                            }
                            mapManager.var.map.fitBounds(bounds);
                            mapManager.var.markerCluster = new MarkerClusterer(mapManager.var.map, mapManager.var.markerAry);
                        }
                    },
                    error: function(error) {},
                });

            },
            getResult: function() {
                var _distance = parseInt($jQObj.slider.slider("option", "value") * 1000);
                mapManager.overlay.clearMarkers();
                fb.search.place($jQObj.queryString.val(), _distance);
            }
        };

    })();

    jQuery(function($) {
        mapManager.action.initialize();
        mapManager.action.geolocation();

        $("#hungry").click(function() {
            fb.search.getResult();
        });

        $jQObj.queryString.keypress(function(event) {
            if (event.which === 13) {
                fb.search.getResult();
            }
        });
    });

})();
