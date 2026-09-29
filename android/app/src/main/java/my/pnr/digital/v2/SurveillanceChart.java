package my.pnr.digital.v2;

import android.animation.ValueAnimator;
import android.graphics.*;
import android.view.*;
import java.util.*;

/** Animated native charts, with text equivalents for accessibility. */
final class SurveillanceChart extends View {
    final MainActivity a; final String[] labels; final double[] values; final boolean donut;
    final Paint p=new Paint(Paint.ANTI_ALIAS_FLAG);
    final int[] palette={0xff0d9488,0xff38bdf8,0xff6366f1,0xfff59e0b,0xfff472b6,0xff94a3b8};
    float reveal=1; int selected=-1; ValueAnimator animation;
    SurveillanceChart(MainActivity activity,Map<String,Double> series,boolean ring){
        super(activity);a=activity;donut=ring;labels=series.keySet().toArray(new String[0]);values=new double[labels.length];
        StringBuilder description=new StringBuilder(ring?"Agihan tanaman. ":"Trend laporan. ");
        for(int i=0;i<labels.length;i++){double v=series.get(labels[i]);values[i]=Double.isFinite(v)?Math.max(0,v):0;description.append(labels[i]).append(": ").append((int)values[i]).append(" rekod. ");}
        setContentDescription(description.toString());setFocusable(true);setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_YES);
        setOnClickListener(v->{if(labels.length>0){selected=(selected+1)%labels.length;invalidate();announceForAccessibility(labels[selected]+": "+(int)values[selected]+" rekod");}});
    }
    @Override protected void onAttachedToWindow(){super.onAttachedToWindow();if(ValueAnimator.areAnimatorsEnabled()){animation=ValueAnimator.ofFloat(0,1);animation.setDuration(650);animation.setInterpolator(new android.view.animation.DecelerateInterpolator());animation.addUpdateListener(v->{reveal=(Float)v.getAnimatedValue();invalidate();});animation.start();}}
    @Override protected void onDetachedFromWindow(){if(animation!=null)animation.cancel();super.onDetachedFromWindow();}
    void type(Canvas c,String value,float x,float y,int size,int color,Paint.Align align){p.setShader(null);p.setStyle(Paint.Style.FILL);p.setColor(color);p.setTextAlign(align);p.setTypeface(Typeface.create("sans-serif-medium",0));p.setTextSize(a.dp(size)*Math.min(1.3f,getResources().getConfiguration().fontScale));c.drawText(value,x,y,p);}
    @Override protected void onDraw(Canvas c){
        super.onDraw(c);float w=getWidth(),h=getHeight();if(labels.length==0){type(c,"Tiada data dalam pilihan ini",w/2,h/2,14,a.MUTED,Paint.Align.CENTER);return;}
        if(donut){
            double total=0;for(double v:values)total+=v;float radius=Math.min(w*.30f,h*.34f),cx=w/2,cy=h/2;RectF box=new RectF(cx-radius,cy-radius,cx+radius,cy+radius);
            p.setStyle(Paint.Style.STROKE);p.setStrokeWidth(a.dp(26));p.setColor(a.LINE);c.drawOval(box,p);float start=-90;
            for(int i=0;i<values.length;i++){float sweep=total>0?(float)(values[i]/total*360):0;p.setColor(palette[i%palette.length]);p.setStrokeWidth(a.dp(selected==i?32:26));c.drawArc(box,start,Math.max(0,sweep*reveal-2),false,p);start+=sweep;}
            type(c,String.valueOf((int)(selected<0?total:values[selected])),cx,cy,34,a.INK,Paint.Align.CENTER);type(c,selected<0?"laporan":"rekod dipilih",cx,cy+a.dp(23),12,a.MUTED,Paint.Align.CENTER);p.setStyle(Paint.Style.FILL);return;
        }
        float left=a.dp(38),right=w-a.dp(26),top=a.dp(46),bottom=h-a.dp(34);double max=1;for(double v:values)max=Math.max(max,v);max=Math.ceil(max/4)*4;
        for(int grid=0;grid<=4;grid++){float y=bottom-(bottom-top)*grid/4;p.setColor(a.LINE);p.setStrokeWidth(a.dp(1));c.drawLine(left,y,right,y,p);type(c,String.format(Locale.US,"%.0f",max*grid/4),left-a.dp(8),y+a.dp(4),10,a.MUTED,Paint.Align.RIGHT);}
        float[] xs=new float[values.length],ys=new float[values.length];Path line=new Path(),area=new Path();
        for(int i=0;i<values.length;i++){xs[i]=values.length==1?(left+right)/2:left+(right-left)*i/(values.length-1);ys[i]=bottom-(float)(values[i]/max)*(bottom-top)*reveal;if(i==0){line.moveTo(xs[i],ys[i]);area.moveTo(xs[i],bottom);area.lineTo(xs[i],ys[i]);}else{line.lineTo(xs[i],ys[i]);area.lineTo(xs[i],ys[i]);}}
        area.lineTo(xs[xs.length-1],bottom);area.close();p.setStyle(Paint.Style.FILL);p.setShader(new LinearGradient(0,top,0,bottom,0x880d9488,0x000d9488,Shader.TileMode.CLAMP));c.drawPath(area,p);p.setShader(null);p.setStyle(Paint.Style.STROKE);p.setColor(a.TEAL);p.setStrokeWidth(a.dp(3));p.setStrokeJoin(Paint.Join.ROUND);c.drawPath(line,p);p.setStyle(Paint.Style.FILL);
        for(int i=0;i<values.length;i++){p.setColor(a.WHITE);c.drawCircle(xs[i],ys[i],a.dp(5),p);p.setColor(a.TEAL);c.drawCircle(xs[i],ys[i],a.dp(3),p);if(i==0||i==values.length-1||i==values.length/2)type(c,labels[i].length()>=7?labels[i].substring(5):labels[i],xs[i],bottom+a.dp(22),11,a.MUTED,Paint.Align.CENTER);}
        int focus=selected<0?values.length-1:selected;p.setColor(0x220d9488);c.drawCircle(xs[focus],ys[focus],a.dp(11),p);type(c,labels[focus]+"  /  "+(int)values[focus]+" rekod",left,top-a.dp(22),12,a.INK,Paint.Align.LEFT);
    }
    @Override public boolean onTouchEvent(MotionEvent event){
        if(donut)return super.onTouchEvent(event);
        if(event.getAction()==MotionEvent.ACTION_UP&&labels.length>0){float left=a.dp(38),right=getWidth()-a.dp(26);int point=Math.max(0,Math.min(labels.length-1,Math.round((event.getX()-left)/Math.max(1,right-left)*(labels.length-1))));selected=point-1;performClick();return true;}
        return event.getAction()==MotionEvent.ACTION_DOWN||super.onTouchEvent(event);
    }
}
