import { EntradaEducart } from '@/components/EntradaEducart';
import './entrada.css';

export const metadata = {
  title: 'EducART | Portal Cultural',
  description: 'Descubra caminhos de formação, arte e expressão na EducART, em Salvador.',
};

export default function HomePage() {
  return <EntradaEducart />;
}
