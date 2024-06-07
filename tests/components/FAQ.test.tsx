import { render, screen } from '@testing-library/react';

import '@testing-library/jest-dom';
import { FAQ } from '@/app/components/FAQ/FAQ';
import { questions } from '@/app/components/FAQ/data/questions';

describe('FAQ Component', () => {
    it('renders the FAQ title', () => {
        render(<FAQ />);
        expect(screen.getByText('FAQ')).toBeInTheDocument();
    });
});
