import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule, NgIf } from '@angular/common';

@Component({
  imports: [CommonModule,NgIf, ReactiveFormsModule,MatFormFieldModule,MatInputModule,MatIconModule],
  selector: 'app-message-input',
  templateUrl: './message-input.component.html',
  styleUrls: ['./message-input.component.css']
})
export class MessageInputComponent implements OnInit {
  @Input() disabled = false;
  @Output() messageSent = new EventEmitter<string>();
  @Output() typing = new EventEmitter<void>();

  messageForm: FormGroup;
  private typingTimeout: any;

  constructor(private formBuilder: FormBuilder) {
    this.messageForm = this.formBuilder.group({
      message: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.messageForm.invalid || this.disabled) {
      return;
    }

    const message = this.messageForm.value.message.trim();
    if (message) {
      this.messageSent.emit(message);
      this.messageForm.reset({ message: '' });
    }
  }

  onTyping(): void {
    // Clear previous timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    // Emit typing event
    this.typing.emit();

    // Set timeout to stop typing indicator after 2 seconds of inactivity
    this.typingTimeout = setTimeout(() => {
      // You could emit another event here if needed to indicate user stopped typing
    }, 2000);
  }
}
