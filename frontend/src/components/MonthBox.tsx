interface MonthBoxProps {
  paid: boolean;
  clickable: boolean;
  onClick?: () => void;
}

export default function MonthBox({ paid, clickable, onClick }: MonthBoxProps) {
  return (
    <div
      className={`month-box ${paid ? 'paid' : 'unpaid'} ${clickable ? 'clickable' : ''}`}
      onClick={clickable ? onClick : undefined}
      title={paid ? 'Paid — click to mark unpaid' : 'Unpaid — click to mark paid'}
    />
  );
}
