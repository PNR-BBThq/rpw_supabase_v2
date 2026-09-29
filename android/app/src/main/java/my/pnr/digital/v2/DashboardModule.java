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
    android.app.Dialog filterSheet;
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
        a.heading("PNR  /  BIOSEKURITI","Pusat pemantauan","Data lapangan. Keputusan lebih jelas.");
        LinearLayout c=a.scroller();
        List<JSONObject> rows=a.filtered();double planted=0,attacked=0;TreeSet<String> crops=new TreeSet<>();TreeMap<String,Double> monthly=new TreeMap<>(),top=new TreeMap<>(),plants=new TreeMap<>();
        for(JSONObject r:rows){
            double lt=r.optDouble("lt",0),ls=r.optDouble("ls",0);if(Double.isFinite(lt))planted+=Math.max(0,lt);if(Double.isFinite(ls))attacked+=Math.max(0,ls);
            String name=r.optString("tn");if(!name.isEmpty()){crops.add(name);plants.put(name,plants.getOrDefault(name,0d)+1);}
            String date=r.optString("t");if(date.matches("\\d{4}-(0[1-9]|1[0-2])-\\d{2}")){String month=date.substring(0,7);monthly.put(month,monthly.getOrDefault(month,0d)+1);}
            JSONObject p=a.object(r,"p");Iterator<String> keys=p.keys();while(keys.hasNext()){String key=keys.next();double value=p.optDouble(key,0);if(Double.isFinite(value)&&value>0)top.put(key,top.getOrDefault(key,0d)+value);}
        }
        LinearLayout pulse=a.card(c,a.INK);android.graphics.drawable.GradientDrawable glow=new android.graphics.drawable.GradientDrawable(android.graphics.drawable.GradientDrawable.Orientation.TL_BR,new int[]{0xff10233f,0xff104e62});glow.setCornerRadius(a.dp(26));pulse.setBackground(glow);
        LinearLayout title=a.row();TextView live=a.text("●  LAPORAN DISAHKAN",11,a.LIME,true);live.setLetterSpacing(.08f);title.addView(live,new LinearLayout.LayoutParams(0,-2,1));title.addView(a.text("PNR / 2.4",11,0xffacc7d8,true));pulse.addView(title);a.gap(pulse,8);
        LinearLayout total=a.row();total.addView(a.text(a.hasLoaded?String.valueOf(rows.size()):"—",48,a.WHITE,true));TextView desc=a.text("laporan\ndalam pilihan",13,0xffbad1df,false);desc.setPadding(a.dp(14),0,0,0);total.addView(desc);pulse.addView(total);a.gap(pulse,8);pulse.addView(a.text((a.stateFilter.isEmpty()?a.user.optString("state","ALL"):a.stateFilter)+"  /  "+(a.period.equals("month")?"Bulan ini":a.period.equals("year")?"Tahun ini":"Semua tempoh"),12,a.LIME,false));
        LinearLayout shortcuts=a.row();Button create=a.button("＋ Bancian",true,()->a.navigate("form"));shortcuts.addView(create,new LinearLayout.LayoutParams(0,-2,1));Button rpw=a.button("Perangkap RPW ↗",false,()->a.navigate("rpw"));LinearLayout.LayoutParams rlp=new LinearLayout.LayoutParams(0,-2,1);rlp.leftMargin=a.dp(8);shortcuts.addView(rpw,rlp);c.addView(shortcuts);a.gap(c,18);
        LinearLayout filters=a.row();Button scope=a.button("Penapis analisis ▾",false,()->{LinearLayout panel=a.column();panel.setPadding(a.dp(20),a.dp(12),a.dp(20),a.dp(20));android.app.Dialog sheet=new android.app.Dialog(a);filterSheet=sheet;ScrollView sc=new ScrollView(a);sc.addView(panel);sheet.setContentView(sc);a.filters(panel);a.addButton(panel,"Selesai",true,()->{sheet.dismiss();a.show("home");});sheet.show();sheet.getWindow().setLayout(-1,-2);sheet.getWindow().setGravity(android.view.Gravity.BOTTOM);});filters.addView(scope,new LinearLayout.LayoutParams(0,-2,1));Button sync=a.button("↻ Segerak",false,a::loadData);LinearLayout.LayoutParams slp=new LinearLayout.LayoutParams(0,-2,1);slp.leftMargin=a.dp(8);filters.addView(sync,slp);c.addView(filters);a.gap(c,10);a.syncNote(c);
        HorizontalScrollView tabs=new HorizontalScrollView(a);tabs.setHorizontalScrollBarEnabled(false);LinearLayout items=a.row();items.setPadding(a.dp(4),a.dp(4),a.dp(4),a.dp(4));items.setBackground(a.shape(a.LINE,18));tabs.addView(items);
        for(String name:new String[]{"Ringkasan","Trend","Perosak","Tanaman"}){TextView t=a.text(name,13,tab.equals(name)?a.WHITE:a.MUTED,true);t.setGravity(android.view.Gravity.CENTER);t.setPadding(a.dp(18),a.dp(13),a.dp(18),a.dp(13));t.setMinHeight(a.dp(48));t.setBackground(a.shape(tab.equals(name)?a.INK:a.LINE,14));t.setFocusable(true);t.setSelected(tab.equals(name));t.setOnClickListener(v->{tab=name;a.show("home");});items.addView(t);}c.addView(tabs);a.gap(c,18);
        if(tab.equals("Ringkasan")){
            LinearLayout metrics=a.row();metrics.setGravity(android.view.Gravity.TOP);metric(metrics,"LUAS BERTANAM",a.hasLoaded?a.number(planted):"—","hektar dilaporkan",a.TEAL);metric(metrics,"LUAS SERANGAN",a.hasLoaded?a.number(attacked):"—","hektar dilaporkan",a.RED);c.addView(metrics);a.gap(c,16);
            trend(c,monthly,6);LinearLayout coverage=a.card(c,a.WHITE);coverage.addView(a.text(crops.size()+" tanaman dipantau",20,a.INK,true));a.gap(coverage,5);coverage.addView(a.text("Liputan berdasarkan laporan yang sepadan dengan penapis.",13,a.MUTED,false));a.addButton(coverage,"Teroka agihan tanaman →",false,()->{tab="Tanaman";a.show("home");});
        }else if(tab.equals("Trend"))trend(c,monthly,12);
        else if(tab.equals("Perosak"))bars(c,"15 perosak utama","Luas serangan terkumpul · ha",top,15,true,"ha",a.TEAL);
        else {
            List<Map.Entry<String,Double>> ranked=new ArrayList<>(plants.entrySet());ranked.sort((x,y)->Double.compare(y.getValue(),x.getValue()));LinkedHashMap<String,Double> composition=new LinkedHashMap<>();double other=0;for(int i=0;i<ranked.size();i++){if(i<5)composition.put(ranked.get(i).getKey(),ranked.get(i).getValue());else other+=ranked.get(i).getValue();}if(other>0)composition.put("Tanaman lain (digabung)",other);
            LinearLayout panel=a.card(c,a.WHITE);panel.addView(a.text("Agihan laporan",22,a.INK,true));panel.addView(a.text("Ketik carta untuk meneliti setiap segmen",12,a.MUTED,false));SurveillanceChart chart=new SurveillanceChart(a,composition,true);panel.addView(chart,new LinearLayout.LayoutParams(-1,a.dp(260)));
            int index=0;double totalPlants=0;for(double count:composition.values())totalPlants+=count;for(Map.Entry<String,Double> entry:composition.entrySet()){LinearLayout legend=a.row();TextView dot=a.text("●",17,chart.palette[index++%chart.palette.length],true);legend.addView(dot);TextView name=a.text(entry.getKey(),14,a.INK,false);name.setPadding(a.dp(10),a.dp(9),a.dp(10),a.dp(9));legend.addView(name,new LinearLayout.LayoutParams(0,-2,1));legend.addView(a.text(String.format(Locale.US,"%.0f · %.1f%%",entry.getValue(),totalPlants>0?entry.getValue()/totalPlants*100:0),12,a.TEAL,true));panel.addView(legend);}
            bars(c,"Liputan terperinci","Bilangan laporan mengikut tanaman",plants,15,true,"rekod",a.BLUE);
        }
        c.addView(a.text("Luas dilaporkan boleh bertindih antara lawatan atau perosak. Bukan keluasan unik.",12,a.MUTED,false));a.gap(c,10);a.addButton(c,"Buka daftar rekod →",true,()->a.navigate("records"));a.addButton(c,"Tugasan & pengesahan",false,()->a.navigate("tasks"));
    }
    void trend(LinearLayout c,TreeMap<String,Double> source,int limit){
        TreeMap<String,Double> values=new TreeMap<>(source);while(values.size()>limit)values.pollFirstEntry();LinearLayout panel=a.card(c,a.WHITE);panel.addView(a.text("Rentak bancian",22,a.INK,true));panel.addView(a.text("Bulan berdata terkini · ketik titik untuk nilai",12,a.MUTED,false));panel.addView(new SurveillanceChart(a,values,false),new LinearLayout.LayoutParams(-1,a.dp(235)));a.gap(panel,6);panel.addView(a.text("Bulan tanpa rekod tidak dipaparkan; graf menghubungkan bulan berdata sahaja.",11,a.MUTED,false));
    }
}
