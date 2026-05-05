const _normalizeForPdfMatch = (text)=> text.toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,' ').trim().toLowerCase();
const dayPadded='02', monthName='enero', monthShort='ene', year='2025';
const dayRe=new RegExp('\\b'+dayPadded+'\\b');
const monthRe=new RegExp('\\b'+monthName+'\\b');
const monthShortRe=new RegExp('\\b'+monthShort+'\\b');
const yearRe=new RegExp('\\b'+year+'\\b');
const candidates=['Operaciones 01 Ene.. 2025.pdf','Operaciones 02 Ene.. 2025.pdf'];
for(const c of candidates){
  const norm=_normalizeForPdfMatch(c.replace(/\.pdf$/i,''));
  let score=0; if(dayRe.test(norm)) score+=6; if(monthRe.test(norm)) score+=5; if(monthShortRe.test(norm)) score+=2; if(yearRe.test(norm)) score+=8; if(norm.includes('operaciones')) score+=1;
  console.log(c); console.log(' norm=',norm,' score=',score); console.log('dayRe',dayRe.test(norm),'monthRe',monthRe.test(norm),'monthShortRe',monthShortRe.test(norm),'yearRe',yearRe.test(norm));
}
