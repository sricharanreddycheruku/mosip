import jsPDF from 'jspdf';
import { ChildRecord } from '../types';

// English labels only
const LABELS = {
  en: {
    title: 'CHILD HEALTH RECORD BOOKLET',
    healthId: 'Health ID',
    childName: 'Child Name',
    age: 'Age',
    weight: 'Weight (kg)',
    height: 'Height (cm)',
    parentGuardian: 'Parent/Guardian',
    malnutritionSigns: 'Visible Signs of Malnutrition',
    recentIllnesses: 'Recent Illnesses',
    parentalConsent: 'Parental Consent',
    recordedOn: 'Recorded on',
    location: 'Location Coordinates',
    latitude: 'Latitude',
    longitude: 'Longitude',
    noneReported: 'None reported',
    notCaptured: 'Not captured',
    yes: 'Yes',
    no: 'No'
  }
};

export class PDFService {
  static async generateHealthBooklet(record: ChildRecord): Promise<Blob> {
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 40;
    let y = 40;

    // Get English labels
    const labels = LABELS.en;

    // Title
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(labels.title, margin, y);
    y += 40;

    // Add photo if available
    try {
      if (record.facePhoto) {
        const imgProps = await new Promise<{ width: number; height: number }>((res, rej) => {
          const img = new Image();
          img.onload = () => res({ width: img.width, height: img.height });
          img.onerror = rej;
          img.src = record.facePhoto;
        });
        
        const maxWidth = 120;
        const ratio = imgProps.width / imgProps.height;
        const imgW = Math.min(maxWidth, imgProps.width);
        const imgH = imgW / ratio;
        pdf.addImage(record.facePhoto, 'JPEG', margin, y, imgW, imgH);
        y += imgH + 30;
      }
    } catch (e) {
      console.warn('Failed to add image to PDF', e);
    }

    // Single column data presentation in English only
    const sections = [
      `${labels.healthId}: ${record.healthId}`,
      `${labels.childName}: ${record.childName}`,
      `${labels.age}: ${record.age}`,
      `${labels.weight}: ${record.childWeight}`,
      `${labels.height}: ${record.childHeight}`,
      `${labels.parentGuardian}: ${record.parentGuardianName}`,
      `${labels.malnutritionSigns}: ${record.visibleSignsMalnutrition || labels.noneReported}`,
      `${labels.recentIllnesses}: ${record.recentIllnesses || labels.noneReported}`,
      `${labels.parentalConsent}: ${record.parentalConsent ? labels.yes : labels.no}`,
      `${labels.recordedOn}: ${record.createdAt ? new Date(record.createdAt).toLocaleString() : ''}`
    ];

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');

    for (const section of sections) {
      const splitText = pdf.splitTextToSize(section, 500); // Full width
      pdf.text(splitText, margin, y);
      y += (splitText.length * 14) + 12;
      
      if (y > 750) {
        pdf.addPage();
        y = margin;
      }
    }

    // Add location information
    y += 10; // Add some space before location section
    
    // Location header
    pdf.setFont('helvetica', 'bold');
    pdf.text(labels.location, margin, y);
    y += 20;
    
    pdf.setFont('helvetica', 'normal');
    
    if (record.location) {
      const locationSections = [
        `${labels.latitude}: ${record.location.latitude.toFixed(6)}`,
        `${labels.longitude}: ${record.location.longitude.toFixed(6)}`
      ];
      
      for (const section of locationSections) {
        const splitText = pdf.splitTextToSize(section, 500);
        pdf.text(splitText, margin, y);
        y += (splitText.length * 14) + 12;
        
        if (y > 750) {
          pdf.addPage();
          y = margin;
        }
      }
    } else {
      const noLocationText = `${labels.location}: ${labels.notCaptured}`;
      const splitText = pdf.splitTextToSize(noLocationText, 500);
      pdf.text(splitText, margin, y);
      y += (splitText.length * 14) + 12;
    }

    return pdf.output('blob');
  }

  static async downloadHealthBooklet(record: ChildRecord): Promise<void> {
    const blob = await this.generateHealthBooklet(record);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `health-record-${record.healthId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}