package my.pnr.digital.v2;
import android.graphics.*;
import android.graphics.pdf.PdfDocument;
import org.json.JSONObject;
import java.util.*;
import java.io.*;
final class ReportPdf {
    static byte[] create(List<JSONObject> rows,String officer,String date) throws IOException {
        if(rows.size()>2000)throw new IOException("Too many records");
        PdfDocument document=new PdfDocument();
        try {
            int pages=Math.max(1,(rows.size()+15)/16);
            Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);
            for(int n=0;n<pages;n++) {
                PdfDocument.Page page=document.startPage(new PdfDocument.PageInfo.Builder(595,842,n+1).create());
                Canvas canvas=page.getCanvas();paint.setColor(Color.rgb(16,35,63));canvas.drawRect(0,0,595,126,paint);
                paint.setColor(Color.WHITE);paint.setTypeface(Typeface.create("sans-serif",Typeface.BOLD));paint.setTextSize(23);canvas.drawText("PNR | Laporan lapangan",32,53,paint);
                paint.setTextSize(11);canvas.drawText("Daftar bancian • "+date+" • "+rows.size()+" rekod ditapis",32,80,paint);
                paint.setColor(Color.rgb(107,220,204));canvas.drawText(fit(officer,paint,525),32,104,paint);
                paint.setColor(Color.rgb(0,119,116));canvas.drawRect(32,146,563,175,paint);
                paint.setColor(Color.WHITE);paint.setTextSize(10);canvas.drawText("TARIKH / LOKASI",42,165,paint);canvas.drawText("TANAMAN",328,165,paint);canvas.drawText("LUAS (ha)",491,165,paint);
                for(int i=n*16;i<Math.min(rows.size(),n*16+16);i++) {
                    JSONObject r=rows.get(i);int y=190+(i%16)*35;
                    if(i%2==0){paint.setColor(Color.rgb(243,247,251));canvas.drawRect(32,y-10,563,y+25,paint);}
                    paint.setTypeface(Typeface.create("sans-serif",Typeface.NORMAL));paint.setTextSize(10);paint.setColor(Color.rgb(16,35,63));canvas.drawText(fit(r.optString("t")+" · "+r.optString("l"),paint,274),42,y,paint);canvas.drawText(fit(r.optString("tn"),paint,150),328,y,paint);canvas.drawText(String.format(Locale.US,"%.2f",r.optDouble("lt",0)),491,y,paint);
                    paint.setTextSize(9);paint.setColor(Color.rgb(89,105,124));canvas.drawText(fit(r.optString("d")+", "+r.optString("n"),paint,275),42,y+14,paint);
                }
                paint.setColor(Color.rgb(89,105,124));paint.setTextSize(9);canvas.drawText("Salinan eksport • Data mengikut tapisan dan cache pada peranti",32,789,paint);canvas.drawText("Halaman "+(n+1)+" / "+pages,470,812,paint);
                document.finishPage(page);
            }
            ByteArrayOutputStream out=new ByteArrayOutputStream();document.writeTo(out);return out.toByteArray();
        }finally{document.close();}
    }
    static String fit(String text,Paint paint,float width){text=text.replace('\n',' ');if(paint.measureText(text)<=width)return text;return text.substring(0,paint.breakText(text,true,width-paint.measureText("…"),null))+"…";}
}
