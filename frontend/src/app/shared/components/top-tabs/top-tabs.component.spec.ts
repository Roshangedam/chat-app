import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopTabsComponent } from './top-tabs.component';

describe('TopTabsComponent', () => {
  let component: TopTabsComponent;
  let fixture: ComponentFixture<TopTabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopTabsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TopTabsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
