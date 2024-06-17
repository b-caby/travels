import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { Injectable } from "@angular/core";
import { Trip } from "../model/trip";
import { CountryDTO } from "../model/countryDTO";
import { environment } from "../../environments/environment";
import moment from "moment";

@Injectable()
export class TravelService {

    private countryURL = (latitude: number, longitude: number): string => `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;

    constructor(private http: HttpClient) { }

    fetchTrips(): Observable<Trip[]> {
        return this.http.get<Trip[]>('assets/travels.json');
    }

    getCountry(latitude: number, longitude: number): Observable<CountryDTO> {
        return this.http.get<CountryDTO>(this.countryURL(latitude, longitude));
    }

    getPictureURL(picture: string): string {
        return `https://${environment.twicpicAccount}.twic.pics/${environment.twicpicPath}/${picture}.jpg`;
    }

    humanizeDate(date: string): string {
        return moment(date, "DD/MM/YYYY").format("D MMMM YYYY");
    }

    humanizeYearAndMonth(date: string): string {
        return moment(date, "DD/MM/YYYY").format("MMMM YYYY");
    }

    humanizeTripDuration(startDate: string, endDate: string): string[] {
        const numberOfDays = this.getNumberOfDays(startDate, endDate);
        return moment.duration(numberOfDays, "days").humanize().replace('a ', '1 ').trim().split(" ");
    }

    humanizeStepDuration(startDate: string, endDate: string) {
        const numberOfDays = this.getNumberOfDays(startDate, endDate);
        return moment.duration(numberOfDays, "days").humanize();
    }

    private getNumberOfDays(startDate: string, endDate: string): number {
        const startMoment = moment(startDate, "DD/MM/YYYY");
        const endMoment = moment(endDate, "DD/MM/YYYY");

        return moment.duration(endMoment.diff(startMoment)).asDays();
    }
}