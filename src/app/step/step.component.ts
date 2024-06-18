import { Component, Input } from '@angular/core';
import { Step } from '../model/step';
import { TravelService } from '../service/travels.service';
import PhotoViewer from 'photoviewer';

@Component({
  selector: 'app-step',
  standalone: true,
  imports: [],
  templateUrl: './step.component.html',
  styleUrl: './step.component.css'
})
export class StepComponent {

  @Input()
  step: Step = { title: "", description: "", date: "", latitude: 0, longitude: 0, pictures: [] };

  @Input()
  position: number = 0;

  public country: string = "";
  public countryFlag: string = "";
  public date: string = "";
  public pictures: string[] = [];

  constructor(private service: TravelService) {}

  ngOnInit(): void {
    this.service.getCountry(this.step.latitude, this.step.longitude).subscribe(data => {
      this.country = data.address.country;
      this.countryFlag = data.address.country_code;
    });

    this.date = this.service.humanizeDate(this.step.date);
    this.pictures = this.step.pictures.map(p => this.service.getPictureURL(p));
  }

  public openPhoto(step: Step) {
    const items: any = [];
    step.pictures.forEach(p => {
      items.push({src: this.service.getPictureURL(p)})
    });
  
  var options = {
      title: false,
      index: 0,
      headerToolbar: ['close'],
      footerToolbar: ['prev','next'],
      multiInstances: false,
      draggable: false,
      resizable: false,
      movable: false,
      initMaximized : true
  };
  
  new PhotoViewer(items, options);
  }
}
