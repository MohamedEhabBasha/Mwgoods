import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-square-label',
  imports: [],
  templateUrl: './square-label.html',
  styleUrl: './square-label.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SquareLabel {
  readonly text = input.required<string>();

  readonly color = input('#111827');

  readonly textColor = input('#111827');

  readonly size = input(8);

  readonly align = input<'left' | 'right'>('left');
}
