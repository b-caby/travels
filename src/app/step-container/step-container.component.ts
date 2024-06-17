import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Trip } from '../model/trip';
import { StepComponent } from "../step/step.component";
import { TravelService } from '../service/travels.service';
import { LngLatBounds, Map } from 'maplibre-gl';

@Component({
    selector: 'app-step-container',
    standalone: true,
    templateUrl: './step-container.component.html',
    styleUrl: './step-container.component.css',
    imports: [StepComponent]
})

export class StepContainerComponent implements OnInit {
  @Input()
  trip: Trip = { id: 0, title: "", background: "", startDate: "", endDate: "", zoom: 0, steps: [] };

  @Input()
  map!: Map;

  @Output() closeEvent = new EventEmitter();

  public startDate: string = "";
  public endDate: string = "";
  public currentStep: number = -1;

  constructor(private service: TravelService) {}

  ngOnInit(): void {
    document.getElementById("trip-scroll")!.addEventListener("scroll", () => { this.FlyToStep(); });

    this.startDate = this.service.humanizeDate(this.trip.startDate);
    this.endDate = this.service.humanizeDate(this.trip.endDate);
  }

  public parseDuration(startDate: string, endDate: string): string {
    return this.service.humanizeStepDuration(startDate, endDate);
  }

  public FlyToStep() {
    if (!this.isScrolledToTop()) {
      const steps = document.querySelectorAll(".step");
      const highestIndexInView = Array.from(steps).reduce((highestIndex, item, index) => {
        if (this.isInViewport(item)) {
          return index;
        }
        return highestIndex; 
      }, -1);

      if (this.currentStep === highestIndexInView) {
        return;
      }
  
      this.currentStep = highestIndexInView;
      this.flyToPoint(this.trip.steps[highestIndexInView].longitude, this.trip.steps[highestIndexInView].latitude, this.trip.zoom ?? 10);
    }
    else {
      this.currentStep = -1;
      this.fitBounds(this.trip.steps.map(s => [s.longitude, s.latitude]));
    }
  }

  public isScrolledToTop() {
    var mainContainer = document.getElementById("trip-scroll")!.getBoundingClientRect();
    var scrollContainer = document.querySelector(".limit-start")!.getBoundingClientRect();
    return scrollContainer.top === mainContainer.top + 28;
  }

  public isInViewport(element: Element) {
    var elementRect = element.getBoundingClientRect();
    var containerRect = document.getElementById("trip-scroll")!.getBoundingClientRect();

    return elementRect.top < containerRect.bottom * 0.7;
  }

  public emitCloseTrip(){
    this.closeEvent.emit();
  }

  public flyToPoint(latitude: number, longitude: number, zoom: number) {
    this.map.resize();
    this.map.flyTo({
      center: [latitude, longitude],
      zoom: zoom,
      speed: 4
    });
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
}
