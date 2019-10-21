import {Component, OnDestroy, OnInit, Renderer2, ViewChild, ViewEncapsulation} from '@angular/core';
import {FormBuilder, FormControl, FormGroup, Validators} from "@angular/forms";
import {Doctor} from "../doctor";
import {DomSanitizer} from "@angular/platform-browser";
import {AuthenticationService} from "../shared/services/authentication.service";
import {AlertService} from "../shared/services/alert.service";
import {User} from "../_models/user";
import {Subscription} from "rxjs";
import {ActivatedRoute, Router} from '@angular/router';
import {first} from 'rxjs/operators';
// import {UserService} from "../shared/services/user.service";
import {NotLoggedComponent} from "../not-logged/not-logged.component";
import {MatDatepicker, MatDatepickerInputEvent} from '@angular/material/datepicker';
import * as moment from "moment";
import {MatDialog} from "@angular/material/dialog";
import { RegisterService } from "../shared/services";

@Component({
  selector: 'app-main-picker',
  templateUrl: './main-picker.component.html',
  styleUrls: ['./main-picker.component.css'],

})
export class MainPickerComponent implements OnInit, OnDestroy {
  specialtyForm: FormGroup;
  cityForm: FormGroup;
  specialty;
  city;
  cities;
  doctors;
  specialtySubmitted = false;
  citySubmitted = false;
  stepCounter = 1;
  calendarClicked = false;
  currentState = 'initial';
  currentUser: User;
  currentUserSubscription: Subscription;
  selectedDoctor;
  selectedDoctorDetails;
  users: User[] = [];
  date: string;
  hour: string;
  datePicked = false;
  hourPicked = false;
  requestSent = false;
  visitsCount;
  imgPath;
  doctorsList;
  avHours = ['8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];
  request = {doctorId: 1, date: 'a', hour: 'b', status: 'c'};


  @ViewChild('datePicker', {static: true}) datePicker: MatDatepicker<Date>;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authenticationService: AuthenticationService,
    private sanitizer: DomSanitizer,
    // private userService: UserService,
    private alertService: AlertService,
    private renderer: Renderer2,
    private dialog: MatDialog,
    private registerService: RegisterService
  ) {
    this.renderer.removeClass(document.body, 'landing2');
    this.renderer.addClass(document.body, 'landing1');
    this.currentUserSubscription = this.registerService.currentUser.subscribe(user => {
      this.currentUser = user;
      if (this.currentUser) {
        this.imgPath = this.sanitizer.bypassSecurityTrustResourceUrl('data:image/jpg;base64,'
          + this.currentUser.profilePic);
      }
    });
  }

  ngOnInit() {
    this.fetchDoctors();
    // this.uniqueSpecialties();
    this.uniqueCities();
    this.visitsCounter();
    this.specialtyForm = this.formBuilder.group({
      specialty: ['', Validators.required]
    });
    this.cityForm = this.formBuilder.group({
      city: ['', Validators.required]
    });
  }

  ngOnDestroy() {
    // unsubscribe to ensure no memory leaks
    this.currentUserSubscription.unsubscribe();
  }

  addEvent(event: MatDatepickerInputEvent<Date>) {
    this.date = moment((event.value.toLocaleDateString()),'DD.MM.YYYY').format('DD.MM.YYYY');
    console.log(this.date);
    this.datePicked = true;
    this.calendarClicked = false;
  }

  // shows specialties based on original cities
  uniqueCities() {
    if (this.doctorsList && this.doctorsList.length > 0) {
      const unique = this.doctorsList.map(s => s.specialty).filter((e, i, a) => a.indexOf(e) === i);
      return unique;
    } else {
      return ['Not Found!'];
    }
  }

  pickSpecialty(specialty) {
    this.cities = this.doctorsList.filter(e => e.specialty == specialty).map(d => d.city).filter((e, i, a) => a.indexOf(e) === i);
    this.specialty = specialty;
    console.log(specialty);
  }

  submitSpecialty() {
    this.specialtySubmitted = true;
    if (this.specialtyForm.invalid) {
      return;
    } else {
      this.stepCounter = 2;
    }
  }

  pickCity(specialty, city) {
    this.doctors = this.doctorsList.filter(e => e.specialty == specialty && e.city == city);
    this.city = city;
    console.log(this.doctors);
  }

  submitCity() {
    this.citySubmitted = true;
    if (this.cityForm.invalid) {
      return;
    } else {
      this.stepCounter = 3;
    }
  }


  get f() {
    return this.specialtyForm.controls;
  }

  get g() {
    return this.cityForm.controls;
  }

  visitsCounter() {
  this.registerService.getAll().pipe(first()).subscribe(users => {
    if (users.map(e => e.visits).length > 0) {
      this.visitsCount = users.map(e => e.visits).reduce((a, b) => [...a, ...b]).length;
    } else {
      this.visitsCount = 1; }
    }
  );
}

  calendarClick(i: number) {
    this.calendarClicked = false;
    this.selectedDoctor = i;
    setTimeout(() => this.calendarClicked = true, 100);
    this.datePicked = false;
  }

  fetchDoctors() {
    this.registerService.getAll().subscribe(doctors => {
      this.doctorsList = doctors.filter(e => e.userType === 'Doctor');
      console.log(this.doctorsList);
    });

  }

  pickHour(hour) {
    this.hour = hour;
    this.request.date = this.date;
    this.request.doctorId = this.selectedDoctorDetails._id;
    this.request.hour = this.hour;
    this.request.status = 'pending';
    // console.log(this.request);
    this.hourPicked = true;
    this.requestSent = false;
  }

  sendRequest() {
    if(this.currentUser) {
      this.visitsCount++;
      console.log(this.visitsCount);
      const foundIndex = this.doctorsList.findIndex(x => x._id === this.selectedDoctorDetails._id);
      const doctorName = this.doctorsList[foundIndex].firstName + ' ' + this.doctorsList[foundIndex].lastName;
      const patientName = this.currentUser.firstName + ' ' + this.currentUser.lastName;
      // console.log(doctor);
      this.currentUser.visits.push({
        date: this.request.date,
        id: this.visitsCount,
        doctorName: doctorName,
        patientName: patientName,
        patientId: this.currentUser._id,
        hour: this.request.hour,
        status: this.request.status,
        doctorId: this.selectedDoctorDetails._id
      });
      this.selectedDoctorDetails.visits.push({
        date: this.request.date,
        id: this.visitsCount,
        patientName: patientName,
        patientId: this.currentUser._id,
        doctorName: doctorName,
        hour: this.request.hour,
        status: this.request.status,
        doctorId: this.selectedDoctorDetails._id,
        read: false
      });
      this.registerService.update(this.currentUser).subscribe();
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
      this.registerService.update(this.selectedDoctorDetails).subscribe();
      this.requestSent = true;
      this.alertService.success('Request has been sent! Waiting for confirmation.', false);
    } else {
      this.dialog.open(NotLoggedComponent);
    }
  }

  getRating(doctor) {
    if (doctor.rating === undefined) {
      return 0;
    } else {
    return doctor.rating * 20;
    }
  }

  clearAlert() {
    this.alertService.clearAlert();
  }


}
