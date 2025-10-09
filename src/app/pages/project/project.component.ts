import { AfterViewInit, Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-project',
  templateUrl: './project.component.html',
  styleUrls: ['./project.component.css']
})
export class ProjectComponent implements AfterViewInit, OnInit {

  constructor() { }

  ngOnInit(): void {
  }
 ngAfterViewInit(): void {
    // ----------------------------------------------------
   // In home.component.ts inside ngAfterViewInit()

// FIX: Access jQuery via (window as any).$
const $ = (window as any).$; 

// Check if jQuery/Owl Carousel are available before initializing
if ($ && $.fn.owlCarousel) {
    $('.project-carousel').owlCarousel({
        autoplay: true,
        smartSpeed: 1000,
        center: false,
        dots: true,
        loop: true,
        margin: 25, // Space between items
         
        navText: [ 
            '<i class="bi bi-arrow-left"></i>', // Use bi icons or fas icons
            '<i class="bi bi-arrow-right"></i>'
        ],
        responsive: {
            0: {
                items: 1 // Mobile: Show 1 item
            },
            768: {
                items: 2 // Tablet/Desktop: Show 2 items
            }
        }
    });

    // ... your existing testimonial carousel initialization ...
}}
}
