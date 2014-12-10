import java.io.File;
import java.util.ArrayList;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.commons.io.Charsets;
import org.apache.commons.io.FileUtils;
import org.simpleframework.xml.Attribute;
import org.simpleframework.xml.ElementList;
import org.simpleframework.xml.Path;
import org.simpleframework.xml.Root;
import org.simpleframework.xml.Text;
import org.simpleframework.xml.core.Persister;
import org.simpleframework.xml.stream.Format;

import com.google.common.collect.Lists;
import com.google.common.io.Files;


public class Convert
{
    public static void main(String [] args) throws Exception
    {
        Persister p = new Persister(new Format(2));
        File out = new File("C:\\_tmp\\20newssolr");
        Pattern subject = Pattern.compile("^(?:Subject: )(.+)", Pattern.MULTILINE);
        for (File f : FileUtils.listFiles(new File("C:/_tmp/20news"), null, true))
        {
            AddDoc doc = new AddDoc();

            String content = Files.toString(f, Charsets.ISO_8859_1);
            content = content.replace((char) 26, ' ');
            content = content.replace((char) 12, ' ');
            content = content.replace((char) 8, ' ');
            
            Matcher matcher = subject.matcher(content);
            if (matcher.find()) {
                doc.fields.add(new Field("title", matcher.group(1)));
            }
            doc.fields.add(new Field("name", f.getName()));
            doc.fields.add(new Field("content", content));

            if (content.length() < 1024 * 3) 
                continue;

            p.write(doc, new File(out, f.getName() + ".xml"));
        }
    }
    
    @Root(name = "add")
    public static class AddDoc {
        @Path(value = "doc")
        @ElementList(inline = true, entry = "field")
        public ArrayList<Field> fields = Lists.newArrayList();
    }
    
    @Root(name = "field")
    public static class Field {
        public Field(String name, String value)
        {
            this.name = name;
            this.value = value;
        }

        @Attribute()
        public String name;

        @Text(data = true)
        public String value;
    }
}
