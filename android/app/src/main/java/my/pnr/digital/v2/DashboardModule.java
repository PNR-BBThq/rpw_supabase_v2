package my.pnr.digital.v2;

import android.graphics.Color;
import android.view.Gravity;
import android.widget.*;
import org.json.*;
import java.util.*;

/** Native analytical workspace. All figures derive from the filtered cached dataset. */
final class DashboardModule {
    final MainActivity a;
    String tab="Ringkasan", district="", crop="", pest="";
    DashboardModule(MainActivity activity){a=activity;}
    boolean matches(JSONObject r){
        return (district.isEmpty()||district.equals(r.optString("d")))
            &&(crop.isEmpty()||crop.equals(r.optString("tn")))
            &&(pest.isEmpty()||a.object(r,"p").has(pest));
    }
    void selector(LinearLayout c,String title,String key,String current){
        TreeSet<String> options=new TreeSet<>();
        for(int i=0;i<a.records.length();i++){
            JSONObject r=a.records.optJSONObject(i);if(r==null)continue;
            if(!a.stateFilter.isEmpty()&&!a.stateFilter.equals(r.optString("n")))continue;
            if(key.equals("p")){Iterator<String> it=a.object(r,"p").keys();while(it.hasNext())options.add(it.next());}
            else if(!r.optString(key).isEmpty())options.add(r.optString(key));
        }
        List<String> values=new ArrayList<>();values.add("Semua");values.addAll(options);
        a.addButton(c,title+" · "+(current.isEmpty()?"Semua":current)+" ▾",false,()->new android.app.AlertDialog.Builder(a).setTitle(title).setItems(values.toArray(new String[0]),(dialog,index)->{
            String value=index==0?"":values.get(index);
            if(key.equals("d"))district=value;else if(key.equals("tn"))crop=value;else pest=value;
            a.page=0;a.show(a.screen);
        }).show());
    }
    void filters(LinearLayout c){
        a.addButton(c,"Penapis daerah, tanaman & perosak",false,()->{
            LinearLayout panel=a.column();panel.setPadding(a.dp(20),a.dp(10),a.dp(20),a.dp(20));
            android.app.AlertDialog dialog=new android.app.AlertDialog.Builder(a).setTitle("Perincikan analisis").setView(panel).setPositiveButton("Tutup",null).create();
            // Close this panel before opening a choice so stale controls never cover the refreshed screen.
            String[] names={"Daerah","Tanaman","Perosak"},keys={"d","tn","p"},selected={district,crop,pest};
            for(int i=0;i<keys.length;i++){final String key=keys[i],title=names[i],value=selected[i];
                a.addButton(panel,title+" · "+(value.isEmpty()?"Semua":value),false,()->{dialog.dismiss();LinearLayout holder=a.column();selector(holder,title,key,value);((Button)holder.getChildAt(0)).performClick();});
            }
            a.addButton(panel,"Kosongkan penapis terperinci",false,()->{district="";crop="";pest="";a.page=0;dialog.dismiss();a.show(a.screen);});
            dialog.show();
        });
        if(!district.isEmpty()||!crop.isEmpty()||!pest.isEmpty()){
            a.gap(c,8);c.addView(a.text("Pilihan: "+(district.isEmpty()?"Semua daerah":district)+" · "+(crop.isEmpty()?"Semua tanaman":crop)+" · "+(pest.isEmpty()?"Semua perosak":pest),12,a.TEAL,true));
        }
    }
    void metric(LinearLayout row,String title,String value,String unit,int color){
        LinearLayout cell=a.column();cell.setPadding(a.dp(14),a.dp(18),a.dp(14),a.dp(18));cell.setBackground(a.shape(a.WHITE,18));
        cell.addView(a.text(title,12,a.MUTED,true));a.gap(cell,8);cell.addView(a.text(value,26,color,true));cell.addView(a.text(unit,11,a.MUTED,false));
        LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(0,-2,1);lp.rightMargin=a.dp(row.getChildCount()==0?10:0);row.addView(cell,lp);
    }
    void bars(LinearLayout parent,String title,String note,Map<String,Double> values,int limit,boolean ranking,String unit,int color){
        LinearLayout panel=a.card(parent,a.WHITE);panel.addView(a.text(title,20,a.INK,true));panel.addView(a.text(note,12,a.MUTED,false));
        List<Map.Entry<String,Double>> entries=new ArrayList<>(values.entrySet());
        if(ranking)entries.sort((x,y)->Double.compare(y.getValue(),x.getValue()));
        if(entries.isEmpty()){a.gap(panel,18);panel.addView(a.text(a.hasLoaded?"Tiada data dalam pilihan ini.":"Muatkan data untuk melihat analisis.",14,a.MUTED,false));return;}
        if(!ranking&&entries.size()>limit)entries=new ArrayList<>(entries.subList(entries.size()-limit,entries.size()));
        double max=0;for(Map.Entry<String,Double> entry:entries)max=Math.max(max,entry.getValue());
        for(int i=0;i<Math.min(limit,entries.size());i++){
            Map.Entry<String,Double> entry=entries.get(i);a.gap(panel,16);
            LinearLayout line=a.row();line.addView(a.text(entry.getKey(),14,a.INK,true),new LinearLayout.LayoutParams(0,-2,1));
            String amount=unit.equals("rekod")?String.format(Locale.US,"%.0f",entry.getValue()):a.number(entry.getValue());
            line.addView(a.text(amount+" "+unit,12,color,true));panel.addView(line);
            ProgressBar bar=new ProgressBar(a,null,android.R.attr.progressBarStyleHorizontal);bar.setMax(1000);bar.setProgress(max>0?(int)(entry.getValue()/max*1000):0);bar.setProgressTintList(android.content.res.ColorStateList.valueOf(color));bar.setContentDescription(entry.getKey()+": "+amount+" "+unit);panel.addView(bar,new LinearLayout.LayoutParams(-1,a.dp(10)));
        }
    }
    void show(){
        a.heading("PNR · RUANG KERJA","Analisis lapangan","Selamat bertugas, "+a.user.optString("name","Pegawai"));
        LinearLayout c=a.scroller();a.syncNote(c);
        LinearLayout hero=a.card(c,a.INK);hero.addView(a.text("PEMANTAUAN BIOSEKURITI",11,a.LIME,true));a.gap(hero,8);hero.addView(a.text("Dari pemerhatian\nkepada tindakan.",29,a.WHITE,true));a.gap(hero,12);hero.addView(a.text("Rekod disahkan · "+a.user.optString("state","ALL"),13,a.LIME,false));
        LinearLayout actions=a.row();actions.setGravity(Gravity.TOP);a.quickTile(actions,"+ PNR","Bancian","Laporan baharu",a.TEAL,()->a.navigate("form"));a.quickTile(actions,"RPW","Perangkap","Pantau tangkapan",a.BLUE,()->a.navigate("rpw"));c.addView(actions,new LinearLayout.LayoutParams(-1,-2));a.gap(c,18);
        a.filters(c);
        HorizontalScrollView tabs=new HorizontalScrollView(a);tabs.setHorizontalScrollBarEnabled(false);LinearLayout items=a.row();tabs.addView(items);
        for(String name:new String[]{"Ringkasan","Trend","Perosak","Tanaman"}){Button b=a.button(name,tab.equals(name),()->{tab=name;a.show("home");});LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-2,-2);lp.rightMargin=a.dp(6);items.addView(b,lp);}c.addView(tabs);a.gap(c,18);
        List<JSONObject> rows=a.filtered();double planted=0,attacked=0;TreeSet<String> crops=new TreeSet<>();TreeMap<String,Double> monthly=new TreeMap<>(),top=new TreeMap<>(),plants=new TreeMap<>();
        for(JSONObject r:rows){
            planted+=Math.max(0,r.optDouble("lt",0));attacked+=Math.max(0,r.optDouble("ls",0));
            String name=r.optString("tn");if(!name.isEmpty()){crops.add(name);plants.put(name,plants.getOrDefault(name,0d)+1);}
            String date=r.optString("t");if(date.matches("\\d{4}-(0[1-9]|1[0-2])-\\d{2}")){String month=date.substring(0,7);monthly.put(month,monthly.getOrDefault(month,0d)+1);}
            JSONObject p=a.object(r,"p");Iterator<String> keys=p.keys();while(keys.hasNext()){String key=keys.next();double value=p.optDouble(key,0);if(Double.isFinite(value)&&value>0)top.put(key,top.getOrDefault(key,0d)+value);}
        }
        c.addView(a.text(rows.size()+" laporan sepadan · penapis dikongsi dengan Rekod & eksport",12,a.MUTED,false));a.gap(c,12);
        if(tab.equals("Ringkasan")){
            LinearLayout first=a.row();first.setGravity(Gravity.TOP);metric(first,"Laporan disahkan",a.hasLoaded?String.valueOf(rows.size()):"—","rekod dalam pilihan",a.INK);metric(first,"Tanaman dipantau",a.hasLoaded?String.valueOf(crops.size()):"—","jenis tanaman",a.TEAL);c.addView(first);a.gap(c,10);
            LinearLayout second=a.row();second.setGravity(Gravity.TOP);metric(second,"Luas bertanam",a.hasLoaded?a.number(planted):"—","hektar dilaporkan",a.TEAL);metric(second,"Luas serangan",a.hasLoaded?a.number(attacked):"—","hektar dilaporkan",a.RED);c.addView(second);a.gap(c,12);
            c.addView(a.text("Jumlah luas boleh bertindih antara lawatan atau perosak; bukan keluasan unik.",12,a.MUTED,false));a.gap(c,16);
            bars(c,"Aktiviti bancian","Enam bulan berdata terkini · bilangan laporan",monthly,6,false,"rekod",a.TEAL);
        }else if(tab.equals("Trend"))bars(c,"Trend bulanan","12 bulan berdata terkini; bulan tanpa rekod tidak diandaikan sifar.",monthly,12,false,"rekod",a.BLUE);
        else if(tab.equals("Perosak"))bars(c,"15 perosak utama","Jumlah luas serangan mengikut perosak · ha",top,15,true,"ha",a.TEAL);
        else bars(c,"Liputan tanaman","15 tanaman dengan laporan terbanyak",plants,15,true,"rekod",a.BLUE);
        a.addButton(c,"Lihat rekod & eksport pilihan",true,()->a.navigate("records"));
        a.addButton(c,"Tugasan & pengesahan",false,()->a.navigate("tasks"));
        a.addButton(c,a.dataLoading?"Sedang menyegerakkan…":"Segerakkan data",false,a::loadData);
    }
}
