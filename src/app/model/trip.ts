import { Step } from "./step";

export interface Trip {
    id: number;
    title: string;
    background: string;
    startDate: string;
    endDate: string;
    zoom: number;
    steps: Step[];
}