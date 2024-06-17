import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { environment } from '../environments/environment.development';
import { AddLayerObject, GeoJSONSourceSpecification, LngLatBounds, Marker, Map } from 'maplibre-gl';
import { Trip } from './model/trip';
import { TravelService } from './service/travels.service';
import { Position, Geometry, GeoJsonProperties, Feature } from 'geojson';
import { Step } from './model/step';
import { TripComponent } from "./trip/trip.component";
import { StepContainerComponent } from "./step-container/step-container.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, TripComponent, StepContainerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  public map!: Map;
  private isMapInitialized: boolean = false;
  public currentTrip: Trip | undefined;
  public trips: Trip[] = [];
  public coordinates: Position[] = [];
  private readonly dimmedClass: string = "is-dimmed";
  private markers: Marker[] = [];
  private markersOnScreen: { [id: string]: Marker } = {};

  @ViewChild("mapContainer")
  private mapContainer!: ElementRef<HTMLElement>;

  constructor(private service: TravelService) { }

  ngOnInit(): void {
    this.service.fetchTrips().subscribe(data => {
      this.trips = data;
      this.coordinates = data.flatMap(t => t.steps.map(s => [s.longitude, s.latitude]));
    });
  }

  ngAfterViewInit() {
    this.map = new Map({
      container: this.mapContainer.nativeElement,
      style: `https://api.maptiler.com/maps/satellite/style.json?key=${environment.mapToken}`,
      center: [0, 0],
      zoom: 1
    });

    this.map.on("load", () => {
      this.addCluster();
      this.trips.forEach(trip => {
        this.addLine(trip);
      });

      this.fitBounds(this.coordinates);
      this.isMapInitialized = true;
    });

    this.map.on("data", (e: any) => {
      if ((e.sourceId && !e.sourceId.startsWith("cluster-trip")) || !e.isSourceLoaded) return;
      this.map.on("moveend", () => this.updateMarkers());
      this.updateMarkers();
    });
  }

  ngOnDestroy() {
    this.map.remove();
  }

  public onMarkerClicked(trip: Trip, step: Step) {
    if (this.isMapInitialized) {
      if (!this.currentTrip) {
        this.openTrip(trip);
      }
      else {
        const clickedTrip = this.trips.find(t => t === trip);
        const clickedStep = clickedTrip?.steps.findIndex(s => s === step);
        this.scrollToTop(`step-${clickedStep}`);
      }
    }
  }

  public scrollToTop(elementId: string) {
    const element = document.getElementById(elementId);
    element!.scrollIntoView({
      behavior: "auto",
      block: "start",
      inline: "nearest"
    });
  }

  public openTrip(trip: Trip) {
    if (this.isMapInitialized) {
      this.currentTrip = trip;
      this.changeLinesOpacity(this.trips.filter(t => t !== trip), 0);

      setTimeout(() => {
        this.fitBounds(trip.steps.map(s => [s.longitude, s.latitude]));
      }, 100);
    }
  }

  public closeTrip() {
    this.currentTrip = undefined;
    this.changeLinesOpacity(this.trips, 1);
    this.highlightMarkers();

    setTimeout(() => {
      this.fitBounds(this.coordinates);
    }, 100);
  }

  public onMouseEnterTrip(trip: Trip) {
    if (this.isMapInitialized && !this.currentTrip) {
      this.fitBounds(this.coordinates);
      this.changeLinesOpacity(this.trips.filter(t => t !== trip), 0.2);
      this.dimMarkers(trip);
    }
  }

  public onMouseLeaveTrip() {
    if (this.isMapInitialized && !this.currentTrip) {
      this.fitBounds(this.coordinates);
      this.changeLinesOpacity(this.trips, 1);
      this.highlightMarkers();
    }
  }

  private getBounds(coordinates: any[]) {
    return coordinates.reduce((bounds, coord) => {
      return bounds.extend(coord);
    }, new LngLatBounds(coordinates[0], coordinates[0]));
  }

  public fitBounds(coordinates: any[]) {
    this.map.resize();
    this.map.fitBounds(this.getBounds(coordinates), { padding: 30, screenSpeed: 6 });
  }

  public addLine(trip: Trip) {
    this.map.addSource(`line_${trip.id}`, this.createLineSource(trip.steps.map(s => [s.longitude, s.latitude])));
    this.map.addLayer(this.createLineLayer(`line_${trip.id}`));
  }

  public changeLinesOpacity(trips: Trip[], opacity: number) {
    trips.forEach(t => {
      this.map.setPaintProperty(`line_${t.id}`, "line-opacity", opacity);
    });
  }

  private createLineSource(coordinates: Position[]): GeoJSONSourceSpecification {
    return {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: { type: "LineString", coordinates: coordinates },
            properties: {}
          }
        ]
      }
    };
  }

  private createLineLayer(source: string): AddLayerObject {
    return {
      id: source,
      type: "line",
      source: source,
      layout: {
        "line-join": "round",
        "line-cap": "round"
      },
      paint: {
        "line-color": "white",
        "line-width": 2
      }
    };
  }

  public addCluster() {
    const features = this.createClusterFeature();

    this.trips.forEach((_, index) => {
      this.map.addSource(`cluster-trip${index + 1}`, this.createClusterSource(features, index + 1));
      this.map.addLayer(this.createPointLayer(`cluster-trip${index + 1}`));
    });
  }

  public createClusterFeature(): Feature<Geometry, GeoJsonProperties>[] {
    const features: Feature<Geometry, GeoJsonProperties>[] = [];

    this.trips.forEach(trip => {
      trip.steps.forEach((step, index) => {
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [step.longitude, step.latitude] },
          properties: { trip: trip.id, step: index, longitude: step.longitude, latitude: step.latitude }
        })
      })
    });

    return features;
  }

  public createClusterSource(features: Feature<Geometry, GeoJsonProperties>[], index: number): GeoJSONSourceSpecification {
    return {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: features.filter(f => f.properties!["trip"] === index)
      },
      cluster: true,
      clusterRadius: 10,
      clusterProperties: {
        trip: ["min", ["get", "trip"]],
        step: ["min", ["get", "step"]]
      }
    }
  }

  private createPointLayer(source: string): AddLayerObject {
    return {
      id: source,
      type: "circle",
      source: source,
      paint: {
        "circle-color": "white",
        "circle-radius": 0
      }
    };
  }

  public highlightMarkers() {
    this.markers.forEach(marker => {
      marker.removeClassName(this.dimmedClass);
    });
  }

  public dimMarkers(trip: Trip) {
    const markersToDim = this.markers.filter(m => m._element.getAttribute("trip") !== trip.id.toString());
    markersToDim.forEach(marker => {
      marker.addClassName(this.dimmedClass);
    });
  }

  private createMarker(tripId: string, picture: string, clusterNumber?: number): HTMLDivElement {
    const marker = document.createElement("div");
    const markerContainer = document.createElement("div");
    const image = document.createElement("img");
    marker.append(markerContainer);
    markerContainer.append(image);

    marker.className = "step-marker";
    marker.setAttribute("trip", tripId);
    markerContainer.className = "step-marker_container";
    image.src = `https://${environment.twicpicAccount}.twic.pics/${environment.twicpicPath}/${picture}.jpg`;

    if (!!clusterNumber) {
      const clusterContainer = document.createElement("div");
      clusterContainer.innerHTML = clusterNumber.toString();
      clusterContainer.className = "step-marker_cluster";
      marker.append(clusterContainer);
    }

    return marker;
  }

  public updateMarkers() {
    const newMarkers: { [id: string]: Marker } = {};
    let features: any[] = [];

    this.trips.forEach((_, index) => {
      features = [...features, ...this.map.querySourceFeatures(`cluster-trip${index + 1}`)];
    });

    features.forEach(feature => {
      const props = feature.properties;
      const tripId = props.trip;
      const stepId = props.step;

      const coord = !!props.cluster ? feature.geometry.coordinates : [props.longitude, props.latitude];
      const rdm = ((tripId + stepId) * (tripId + stepId + 1) / 2) + stepId;
      const id = !!props.cluster ? rdm : rdm + 10000;

      if (!this.currentTrip || this.currentTrip.id === tripId) {
        let marker = this.markers[id];
        if (!marker) {
          const trip = this.trips.find(trip => trip.id === props.trip);
          if (!trip) return;
          const step = trip.steps.at(stepId);
          if (!step) return;

          const clusterMarker = this.createMarker(tripId, step.pictures.at(0)!, props["point_count_abbreviated"]);
          clusterMarker.addEventListener("click", () => this.onMarkerClicked(trip, step));
          clusterMarker.addEventListener("mouseenter", () => this.onMouseEnterTrip(trip));
          clusterMarker.addEventListener("mouseleave", () => this.onMouseLeaveTrip());
          marker = this.markers[id] = new Marker({ element: clusterMarker }).setLngLat(coord);
        }
        else {
          // Fix an issue where cluster already exists but at the wrong position and the wrong number
          if (props.cluster && marker.getLngLat().toArray() !== coord) {
            marker.setLngLat(coord);
          }

          if (props.cluster && marker._element.getElementsByClassName("step-marker_cluster")[0].innerHTML !== props["point_count_abbreviated"].toString()) {
           marker._element.getElementsByClassName("step-marker_cluster")[0].innerHTML = props["point_count_abbreviated"];
          }
        }

        newMarkers[id] = marker;

        if (!this.markersOnScreen[id]) {
          marker.addTo(this.map);
        }
      }
    });

    for (const id in this.markersOnScreen) {
      if (!newMarkers[id]) {
        this.markersOnScreen[id].remove();
      }
    }

    this.markersOnScreen = newMarkers;
  }
}
